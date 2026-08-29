"""
MPLADS RISE — Bulk data loader
--------------------------------
Generates realistic synthetic MPLADS project records (spanning many
states/districts, work types, and a deliberate mix of clean + anomalous
projects) and pushes them into your LIVE deployed backend via its own
REST API — no direct DB access needed.

Run this on your own machine (not inside a sandboxed tool), since it
needs outbound internet access to your Render backend:

    pip install requests
    python add_more_data.py

Adjust BASE_URL / ADMIN_USER / ADMIN_PASS below if you've changed them.
"""

import random
import time
import requests

# ── Config ───────────────────────────────────────────────────────────────
BASE_URL = "https://mplads-rise.onrender.com/api"   # your backend service
ADMIN_USER = "admin"
ADMIN_PASS = "admin123" # Update this if you used a different password in Render!
NUM_PROJECTS = 150          # how many new projects to add
ANOMALY_RATE = 0.18         # ~18% of projects will be deliberately "suspicious"

STATES_DISTRICTS = {
    "Maharashtra": ["Pune", "Nagpur", "Nashik", "Thane"],
    "Uttar Pradesh": ["Varanasi", "Lucknow", "Kanpur", "Agra"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
    "Karnataka": ["Bengaluru Urban", "Mysuru", "Hubballi"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
    "Kerala": ["Ernakulam", "Kozhikode", "Thrissur"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar"],
    "Telangana": ["Hyderabad", "Warangal"],
}

WORK_TYPES = {
    "Infrastructure": [
        "Construction of Community Hall in {d}",
        "Repair of Village Panchayat Building, {d}",
        "Construction of Boundary Wall for Govt School, {d}",
    ],
    "Roads": [
        "Construction of CC Road from Main Chowk to {d} Bus Stand",
        "Widening of Village Approach Road, {d}",
        "Repair of Damaged Rural Road, {d}",
    ],
    "Water Supply": [
        "Installation of RO Water Plant in Govt Schools, {d}",
        "Deep Borewell Installation for Drinking Water, {d}",
        "Water Purifier Installation in Anganwadi Centres, {d}",
    ],
    "Healthcare": [
        "Upgradation of Primary Health Centre, {d}",
        "Purchase of Ambulance for District Hospital, {d}",
        "Installation of Medical Equipment in CHC, {d}",
    ],
    "Energy": [
        "Installation of Solar Street Lights Phase {n}, {d}",
        "Solar Power Backup for Govt School, {d}",
    ],
    "Education": [
        "Construction of Additional Classrooms, {d}",
        "Smart Classroom Setup in Govt School, {d}",
        "Furniture Supply to Govt Schools, {d}",
    ],
    "Sanitation": [
        "Construction of Public Toilet Complex, {d}",
        "Solid Waste Management Unit, {d}",
    ],
}

AGENCIES = ["PWD", "Zilla Parishad", "Gram Panchayat", "Education Dept",
            "Health Dept", "Municipal Corporation", "Rural Development Dept"]


def gen_project(idx, force_anomaly=False):
    state = random.choice(list(STATES_DISTRICTS.keys()))
    district = random.choice(STATES_DISTRICTS[state])
    work_type = random.choice(list(WORK_TYPES.keys()))
    template = random.choice(WORK_TYPES[work_type])
    work_name = template.format(d=district, n=random.randint(1, 3))

    sanction = round(random.uniform(5, 60), 1)
    physical = random.randint(10, 100)

    is_anomaly = force_anomaly or (random.random() < ANOMALY_RATE)

    if is_anomaly:
        # Pick one flavour of anomaly at random so the risk engine has
        # a realistic variety of things to catch.
        kind = random.choice(["cost_overrun", "ghost_progress", "underspend_complete"])
        if kind == "cost_overrun":
            expenditure = round(sanction * random.uniform(1.4, 2.5), 1)   # spent way more than sanctioned
            financial = 100
        elif kind == "ghost_progress":
            expenditure = round(sanction * random.uniform(0.85, 1.0), 1)  # money spent
            physical = random.randint(5, 25)                              # but almost no physical work
            financial = random.randint(90, 100)
        else:  # underspend_complete: claims completion with barely any money spent
            physical = 100
            expenditure = round(sanction * random.uniform(0.05, 0.2), 1)
            financial = random.randint(5, 20)
    else:
        expenditure = round(sanction * (physical / 100) * random.uniform(0.9, 1.05), 1)
        financial = min(100, physical + random.randint(-5, 10))
        financial = max(financial, 0)

    return {
        "project_id": f"MPL-2026-{10000 + idx}",
        "work_name": work_name,
        "work_type": work_type,
        "state": state,
        "district": district,
        "implementing_agency": random.choice(AGENCIES),
        "sanction_amount_lakh": sanction,
        "expenditure_amount_lakh": expenditure,
        "physical_progress_pct": physical,
        "financial_progress_pct": financial,
    }


def main():
    print(f"Logging in to {BASE_URL} ...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=120,
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in.")

    created, failed = 0, 0
    for i in range(NUM_PROJECTS):
        payload = gen_project(i)
        try:
            r = requests.post(f"{BASE_URL}/projects", json=payload, headers=headers, timeout=30)
            if r.status_code == 200:
                created += 1
            elif r.status_code == 400:
                # project_id clash — just skip
                failed += 1
            else:
                print(f"  ! {payload['project_id']} -> {r.status_code}: {r.text[:150]}")
                failed += 1
        except requests.RequestException as e:
            print(f"  ! network error on {payload['project_id']}: {e}")
            failed += 1

        if (i + 1) % 20 == 0:
            print(f"  ... {i + 1}/{NUM_PROJECTS} processed (created={created}, failed={failed})")
        time.sleep(0.05)  # be gentle on the free-tier instance

    print(f"\nDone. Created {created} projects, {failed} skipped/failed.")

    # Re-run risk assessment across everything so the new rows get
    # risk scores / alerts immediately instead of waiting.
    print("Triggering batch risk assessment...")
    r = requests.post(f"{BASE_URL}/projects/batch-assess", headers=headers, timeout=120)
    print(f"batch-assess -> {r.status_code}: {r.text[:200]}")


if __name__ == "__main__":
    main()
