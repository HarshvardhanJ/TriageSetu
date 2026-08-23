from __future__ import annotations

import json, random, sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sklearn.ensemble import HistGradientBoostingClassifier

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "triagesetu.db"
random.seed(42)

class Intake(BaseModel):
    display_name: str = Field(min_length=2, max_length=80)
    age: int = Field(ge=0, le=120)
    heart_rate: int = Field(ge=20, le=260)
    respiratory_rate: int = Field(ge=5, le=90)
    spo2: int = Field(ge=50, le=100)
    temperature: float = Field(ge=30, le=45)
    systolic_bp: int = Field(ge=40, le=260)
    avpu: Literal["alert", "voice", "pain", "unresponsive"] = "alert"
    complaint: str = Field(min_length=3, max_length=500)
    history_available: bool = False
    active_bleeding: bool = False
    break_glass: bool = False

class Override(BaseModel):
    clinician_id: str = Field(min_length=2, max_length=80)
    clinician_role: str = Field(min_length=2, max_length=80)
    tier: int = Field(ge=1, le=5)
    reason: str = Field(min_length=3, max_length=400)

def age_band(age: int) -> str:
    return "pediatric" if age < 18 else "geriatric" if age >= 65 else "adult"

def symptom_flags(complaint: str) -> dict[str, int]:
    c = complaint.lower()
    return {
        "chest": int(any(x in c for x in ["chest", "tightness", "pressure"])),
        "breath": int(any(x in c for x in ["breath", "asthma", "wheez", "shortness"])),
        "neuro": int(any(x in c for x in ["unconscious", "confusion", "slurred", "seizure", "weakness"])),
        "pregnancy": int(any(x in c for x in ["pregnan", "vaginal bleeding"])),
        "bleed": int(any(x in c for x in ["bleed", "hemorrhage"])),
        "severe": int(any(x in c for x in ["severe", "worst", "collapse", "pale"])),
    }

def features(p: Intake | dict) -> list[float]:
    d = p.model_dump() if isinstance(p, Intake) else p
    band = age_band(d["age"])
    f = symptom_flags(d["complaint"])
    rr_hi = 30 if band == "pediatric" else 22 if band == "geriatric" else 20
    temp_hi = 37.7 if band == "geriatric" else 38.0
    return [
        min(4, max(-2, (d["heart_rate"] - (100 if band != "pediatric" else 120)) / 20)),
        min(4, max(-2, (d["respiratory_rate"] - rr_hi) / 6)),
        min(4, max(-2, (95 - d["spo2"]) / 2)),
        min(4, max(-2, (d["temperature"] - temp_hi) / .6)),
        min(4, max(-2, (95 - d["systolic_bp"]) / 12)),
        int(d["avpu"] != "alert"), int(d["history_available"]),
        f["chest"], f["breath"], f["neuro"], f["pregnancy"], f["bleed"], f["severe"],
        int(band == "pediatric"), int(band == "geriatric"),
    ]

def build_model():
    rows, labels = [], []
    for _ in range(1800):
        age = random.choice([random.randint(1, 17), random.randint(18, 64), random.randint(65, 92)])
        band = age_band(age)
        hr = int(random.gauss(102 if band == "pediatric" else 82, 23))
        rr = int(random.gauss(25 if band == "pediatric" else 18, 6))
        spo2 = max(80, min(100, int(random.gauss(96, 3))))
        temp = round(random.gauss(37.2, .8), 1)
        sbp = max(65, min(210, int(random.gauss(112, 22))))
        complaint = random.choice(["minor pain", "chest tightness", "breathing difficulty", "severe pain", "dizziness"])
        p = {"age":age,"heart_rate":hr,"respiratory_rate":rr,"spo2":spo2,"temperature":temp,"systolic_bp":sbp,"avpu":"alert","history_available":bool(random.getrandbits(1)),"complaint":complaint}
        burden = sum(max(0,x) for x in features(p)[:5]) + sum(features(p)[8:13])
        labels.append(1 if spo2 < 89 else 2 if burden > 6 else 3 if burden > 3 else 4 if burden > 1 else 5)
        rows.append(features(p))
    model = HistGradientBoostingClassifier(max_iter=100, max_leaf_nodes=15, learning_rate=.08, random_state=42)
    model.fit(np.array(rows), np.array(labels))
    return model

MODEL = build_model()

def rule_engine(d: dict) -> tuple[int, list[str]]:
    f, reasons = symptom_flags(d["complaint"]), []
    if d["avpu"] in {"unresponsive", "pain"}:
        return 1, ["AVPU indicates reduced consciousness"]
    if d.get("active_bleeding") or f["bleed"] or f["neuro"]:
        return 1, ["Critical red-flag presentation"]
    if d["spo2"] < 90:
        return 2, [f"SpO₂ {d['spo2']}% is below the critical safety floor"]
    if (f["chest"] and (d["heart_rate"] > 100 or d["respiratory_rate"] > 20 or d["spo2"] < 97)) or d["spo2"] < 95:
        return 3, ["Chest/oxygenation signal triggers an amber safety floor"]
    band = age_band(d["age"])
    if (band == "pediatric" and d["respiratory_rate"] > 30) or (band == "geriatric" and d["temperature"] >= 37.7) or d["systolic_bp"] < 95:
        return 3, ["Age-normalized vital deviates from the safe range"]
    return 5, []

def explain(d: dict, tier: int, confidence: int, reasons: list[str], flags: list[str]) -> str:
    base = reasons[0] if reasons else "Current observed vitals are within the age-adjusted reference range"
    uncertainty = " Full history is unavailable, so the system has escalated for clinician review." if "Needs clinician review" in flags else ""
    return f"Flagged {['','red','red','amber','green','green'][tier]}. {base}. Confidence {confidence}% (advisory only).{uncertainty}"

def score(d: dict, surge: bool = False, wait: int = 0) -> dict:
    rule_tier, reasons = rule_engine(d)
    probabilities = MODEL.predict_proba(np.array([features(d)]))[0]
    classes = list(MODEL.classes_)
    ranked = sorted(zip(probabilities, classes), reverse=True)
    ml_tier, margin = int(ranked[0][1]), float(ranked[0][0] - ranked[1][0])
    completeness = sum(d.get(k) is not None for k in ["heart_rate","respiratory_rate","spo2","temperature","systolic_bp","avpu","complaint"]) / 7
    agreement = rule_tier == 5 or rule_tier == ml_tier
    confidence = round(min(96, max(44, 52 + margin * 42 + completeness * 8 + (8 if d.get("history_available") else 0) + (9 if agreement else -7))))
    tier, flags = min(rule_tier, ml_tier), []
    if rule_tier < 5: flags.append("Rule-based safety net applied")
    uncertain = confidence < 72 or not agreement or not d.get("history_available")
    if uncertain and tier > 1:
        tier -= 1; flags.append("Needs clinician review")
        reasons.append("Low confidence, missing history, or model/rule disagreement caused one-level escalation")
    if surge and tier > 1 and (confidence < 82 or ml_tier <= 3):
        tier -= 1; flags.append("3× surge safety policy applied")
    limit = 15 if tier <= 2 else 30 if tier == 3 else 90
    if wait >= limit:
        tier = max(1, tier-1); flags.append("Reassessment overdue")
        reasons.append(f"Wait of {wait} minutes exceeds the {limit}-minute safety window")
    reasons = list(dict.fromkeys(reasons)) or ["No hard safety rule triggered"]
    return {"recommended_tier":tier,"rule_tier":rule_tier,"ml_tier":ml_tier,"confidence":confidence,"confidence_label":"high" if confidence >= 80 else "moderate" if confidence >= 62 else "low","age_band":age_band(d["age"]),"flags":flags,"reasons":reasons[:3],"explanation":explain(d,tier,confidence,reasons,flags),"feature_contributions": sorted([{"feature":k,"impact":round(abs(v),2)} for k,v in zip(["Heart rate","Respiratory rate","SpO₂","Temperature","Systolic BP","Alertness","History","Chest symptom","Breathlessness","Neurological symptom","Pregnancy","Bleeding","Severity cue","Pediatric band","Geriatric band"],features(d))],key=lambda x:x["impact"],reverse=True)[:4]}

def conn():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def log(event_type: str, patient_id: str | None, detail: dict):
    with conn() as c: c.execute("INSERT INTO audit(created_at,event_type,patient_id,detail) VALUES(?,?,?,?)", (datetime.now(timezone.utc).isoformat(),event_type,patient_id,json.dumps(detail)))

def init_db():
    with conn() as c:
        c.executescript("""CREATE TABLE IF NOT EXISTS patients(id TEXT PRIMARY KEY, display_name TEXT, data TEXT NOT NULL, score TEXT NOT NULL, arrived_at TEXT NOT NULL, wait_minutes INTEGER DEFAULT 0, clinician_tier INTEGER, status TEXT DEFAULT 'waiting'); CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, event_type TEXT NOT NULL, patient_id TEXT, detail TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);""")
        c.execute("INSERT OR IGNORE INTO settings VALUES('surge','false')")
    if not list_patients(): seed_demo()

DEMO = [("Aarav K.",4,"High fever, sleepy and refusing fluids",132,30,96,38.7,92,"voice",0),("Ramesh P.",68,"Chest tightness and sweating",112,23,94,37.1,146,"alert",1),("Meera S.",29,"Twisted ankle while walking",78,16,99,36.8,118,"alert",0),("Unidentified",52,"Found unconscious at bus stand",108,20,89,36.6,86,"unresponsive",0),("Fatima A.",75,"Weakness and new confusion",96,22,95,37.9,102,"voice",1),("Dev R.",33,"Deep cut with ongoing bleeding",104,19,97,36.9,124,"alert",1),("Kavya M.",18,"Headache, nausea, light sensitivity",89,18,98,37.4,116,"alert",0),("Sanjay D.",46,"Cough, breathing feels harder",106,25,92,38.2,130,"alert",0),("Nila T.",2,"Fever and rapid breathing",142,36,94,39.1,88,"alert",0),("Gopal N.",71,"Dizzy after missed meals",62,15,97,36.5,108,"alert",1),("Isha V.",26,"Mild abdominal discomfort",82,17,99,37.0,115,"alert",0),("Arjun B.",39,"Severe abdominal pain, pale",118,22,96,37.8,94,"alert",1),("Leela C.",81,"Fall at home; hip pain",90,20,95,36.8,138,"alert",1),("Mohit J.",15,"Asthma symptoms, inhaler not helping",124,29,91,37.2,106,"alert",1),("Saira H.",31,"Pregnant; bleeding and abdominal pain",102,21,96,37.0,110,"alert",1),("Vikram L.",55,"Medication refill; no acute symptoms",70,14,99,36.7,128,"alert",1),("Rehan Q.",7,"Vomiting twice, drinking water",104,24,98,37.6,96,"alert",0),("Anita G.",64,"Sudden slurred speech",88,18,97,36.8,150,"alert",1),("Joseph M.",49,"Back pain after lifting",80,16,99,36.6,121,"alert",0),("Pooja B.",23,"Panic, tingling fingers, fast breathing",112,27,99,36.9,120,"alert",0)]
def seed_demo():
    for i,x in enumerate(DEMO,101):
        p = Intake(display_name=x[0],age=x[1],complaint=x[2],heart_rate=x[3],respiratory_rate=x[4],spo2=x[5],temperature=x[6],systolic_bp=x[7],avpu=x[8],history_available=bool(x[9]),active_bleeding="bleeding" in x[2].lower())
        create_patient(p, f"TS-{i}", wait=(i*7)%96, audit_event=False)
    log("SYSTEM",None,{"message":"20 curated demo records loaded"})

def is_surge():
    with conn() as c: return c.execute("SELECT value FROM settings WHERE key='surge'").fetchone()[0] == "true"
def create_patient(p: Intake, pid: str, wait: int=0, audit_event=True):
    d=p.model_dump(); s=score(d,is_surge(),wait)
    with conn() as c: c.execute("INSERT INTO patients VALUES(?,?,?,?,?,?,?,?)",(pid,p.display_name,json.dumps(d),json.dumps(s),datetime.now(timezone.utc).isoformat(),wait,None,"waiting"))
    if audit_event: log("INTAKE",pid,{"message":"Structured intake scored", "score":s})
    return patient_by_id(pid)
def patient_by_id(pid):
    with conn() as c: r=c.execute("SELECT * FROM patients WHERE id=?",(pid,)).fetchone()
    if not r: raise HTTPException(404,"Patient not found")
    d=dict(r); d["data"]=json.loads(d["data"]); d["score"]=json.loads(d["score"]); return d
def list_patients():
    with conn() as c: rows=c.execute("SELECT * FROM patients WHERE status='waiting'").fetchall()
    output=[]
    for r in rows:
        d=dict(r); d["data"]=json.loads(d["data"]); d["score"]=json.loads(d["score"])
        if d["clinician_tier"]: d["score"]["display_tier"]=d["clinician_tier"]
        else: d["score"]["display_tier"]=d["score"]["recommended_tier"]
        output.append(d)
    return sorted(output,key=lambda p:(p["score"]["display_tier"],-p["wait_minutes"]))

app=FastAPI(title="TriageSetu API",version="1.0")
@app.on_event("startup")
def startup(): init_db()
@app.get("/api/health")
def health(): return {"ok":True,"model":"HistGradientBoostingClassifier","surge":is_surge()}
@app.get("/api/queue")
def queue(): return {"patients":list_patients(),"surge":is_surge()}
@app.post("/api/patients",status_code=201)
def intake(p: Intake):
    with conn() as c: n=c.execute("SELECT count(*) FROM patients").fetchone()[0]
    return create_patient(p,f"TS-{101+n}")
@app.get("/api/patients/{pid}")
def detail(pid:str): return patient_by_id(pid)
@app.post("/api/patients/{pid}/override")
def override(pid:str, body:Override):
    p=patient_by_id(pid); recommended=p["score"]["recommended_tier"]
    with conn() as c: c.execute("UPDATE patients SET clinician_tier=? WHERE id=?",(body.tier,pid))
    log("OVERRIDE" if body.tier != recommended else "CONFIRMATION",pid,{"from_tier":recommended,"to_tier":body.tier,"reason":body.reason,"clinician_id":body.clinician_id,"clinician_role":body.clinician_role})
    return patient_by_id(pid)
@app.post("/api/surge")
def set_surge(enabled: bool):
    with conn() as c: c.execute("UPDATE settings SET value=? WHERE key='surge'",('true' if enabled else 'false',))
    for p in list_patients():
        new=score(p["data"],enabled,p["wait_minutes"])
        with conn() as c: c.execute("UPDATE patients SET score=? WHERE id=?",(json.dumps(new),p["id"]))
    log("SURGE_POLICY",None,{"enabled":enabled,"message":"Stricter escalation policy recalculated across waiting queue"})
    return {"surge":enabled,"patients":list_patients()}
@app.post("/api/clock/advance")
def advance(minutes:int=30):
    if minutes not in [15,30,60]: raise HTTPException(400,"Demo clock supports 15, 30, or 60 minutes")
    for p in list_patients():
        wait=p["wait_minutes"]+minutes; new=score(p["data"],is_surge(),wait)
        with conn() as c: c.execute("UPDATE patients SET wait_minutes=?, score=? WHERE id=?",(wait,json.dumps(new),p["id"]))
    log("REASSESSMENT",None,{"minutes":minutes,"message":"Deterioration monitor rescored all waiting patients"})
    return {"patients":list_patients()}
@app.get("/api/audit")
def audit():
    with conn() as c: rows=c.execute("SELECT * FROM audit ORDER BY id DESC").fetchall()
    return [{**dict(r),"detail":json.loads(r["detail"])} for r in rows]
@app.post("/api/demo/reset")
def reset_demo():
    with conn() as c: c.execute("DELETE FROM patients"); c.execute("DELETE FROM audit"); c.execute("UPDATE settings SET value='false' WHERE key='surge'")
    seed_demo(); return {"patients":list_patients()}
app.mount("/",StaticFiles(directory=ROOT,html=True),name="web")
