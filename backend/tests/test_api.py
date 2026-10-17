import io
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "SyllabusIQ" in data["service"]

def test_teacher_registration_invite_code(client):
    uid = uuid.uuid4().hex[:6]
    res_fail = client.post("/api/v1/auth/register", json={
        "name": "Prof. Alan Turing",
        "email": f"alan.turing.{uid}@cambridge.edu",
        "password": "securepassword123",
        "role": "teacher",
        "invite_code": "INVALID-CODE",
    })
    assert res_fail.status_code == 400

    res_success = client.post("/api/v1/auth/register", json={
        "name": "Prof. Alan Turing",
        "email": f"alan.turing.ok.{uid}@cambridge.edu",
        "password": "securepassword123",
        "role": "teacher",
        "invite_code": "INST-STANFORD-2026",
    })
    assert res_success.status_code == 200
    data = res_success.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["role"] == "teacher"

def test_student_registration_and_login(client):
    uid = uuid.uuid4().hex[:6]
    email = f"ada.lovelace.{uid}@oxford.edu"
    res_reg = client.post("/api/v1/auth/register", json={
        "name": "Ada Lovelace",
        "email": email,
        "password": "ada_password_2026",
        "role": "student",
        "roll_no": "CS24B001",
    })
    assert res_reg.status_code == 200
    token = res_reg.json()["access_token"]

    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email

def test_demo_login(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "e.vance@stanford.edu",
        "password": "password123",
    })
    assert res.status_code == 200
    assert res.json()["user"]["role"] == "teacher"

def test_classroom_creation_and_listing(client):
    res_login = client.post("/api/v1/auth/login", json={
        "email": "e.vance@stanford.edu",
        "password": "password123",
    })
    token = res_login.json()["access_token"]

    res_create = client.post(
        "/api/v1/classrooms",
        json={
            "name": "CS401: Advanced Operating Systems",
            "subject": "Operating Systems",
            "semester": "Fall 2026",
            "description": "Kernel architecture and virtualization",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_create.status_code == 200
    class_id = res_create.json()["id"]
    class_code = res_create.json()["class_code"]
    assert class_code is not None

    res_list = client.get("/api/v1/classrooms", headers={"Authorization": f"Bearer {token}"})
    assert res_list.status_code == 200
    assert len(res_list.json()) > 0

def test_document_ingestion_and_chunking(client):
    res_login = client.post("/api/v1/auth/login", json={
        "email": "e.vance@stanford.edu",
        "password": "password123",
    })
    token = res_login.json()["access_token"]

    # Ingest text lecture notes
    sample_notes = """
Unit 2: Memory Virtualization and Multi-Level Paging
Multi-level paging decomposes virtual addresses into hierarchical directories: PML4, PDP, PD, and PT.
When a TLB miss occurs, the hardware MMU walks through each level in DRAM sequentially, resulting in up to 4 memory accesses.
Inverted page tables maintain an entry per physical frame, substantially reducing memory consumption at the cost of hash table collision resolution.
"""
    files = {"file": ("OS_Unit2_Notes.txt", io.BytesIO(sample_notes.encode("utf-8")), "text/plain")}
    data = {"unit": "Unit 2", "topic": "Virtual Memory & Paging"}

    res_upload = client.post(
        "/api/v1/classrooms/cls_os_401/documents/upload",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_upload.status_code == 200
    doc_data = res_upload.json()
    assert doc_data["status"] == "ready"
    assert doc_data["chunk_count"] > 0
    doc_id = doc_data["id"]

    # Verify chunk inspector
    res_chunks = client.get(f"/api/v1/documents/{doc_id}/chunks", headers={"Authorization": f"Bearer {token}"})
    assert res_chunks.status_code == 200
    chunks = res_chunks.json()
    assert len(chunks) > 0
    assert "Multi-level paging" in chunks[0]["text"]

def test_rag_quiz_generation_publish_and_exam_run(client):
    # 1. Login teacher
    res_teacher = client.post("/api/v1/auth/login", json={
        "email": "e.vance@stanford.edu",
        "password": "password123",
    })
    teacher_token = res_teacher.json()["access_token"]

    # Ensure classroom exists
    client.post(
        "/api/v1/classrooms",
        json={
            "name": "CS401: Advanced Operating Systems",
            "subject": "Operating Systems",
            "semester": "Fall 2026",
            "description": "Kernel architecture and virtualization",
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    # 2. Generate RAG quiz
    res_gen = client.post(
        "/api/v1/classrooms/cls_os_401/quizzes/generate",
        json={
            "classroom_id": "cls_os_401",
            "title": "Unit 2 Assessment: Multi-Level Paging",
            "count": 2,
            "difficulty": "medium",
            "unit": "Unit 2",
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert res_gen.status_code == 200
    quiz_data = res_gen.json()
    quiz_id = quiz_data["id"]
    assert quiz_data["status"] == "draft"
    assert len(quiz_data["questions"]) > 0

    # 3. Publish quiz
    res_pub = client.post(
        f"/api/v1/quizzes/{quiz_id}/publish",
        json={
            "start_at": "2026-09-01T00:00:00Z",
            "deadline": "2026-12-31T23:59:59Z",
            "duration_min": 25,
            "attempts_allowed": 2,
            "shuffle_questions": True,
            "shuffle_options": True,
            "show_results": "immediate",
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert res_pub.status_code == 200

    # 4. Login student
    res_student = client.post("/api/v1/auth/login", json={
        "email": "a.rivera@stanford.edu",
        "password": "password123",
    })
    student_token = res_student.json()["access_token"]

    # 5. Start attempt (server-authoritative timer)
    res_start = client.post(
        f"/api/v1/quizzes/{quiz_id}/attempts/start",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_start.status_code == 200
    attempt_data = res_start.json()
    attempt_id = attempt_data["id"]
    assert attempt_data["status"] == "in_progress"
    assert attempt_data["expires_at"] is not None

    # 6. Autosave answer
    first_q_id = quiz_data["questions"][0]["q_id"]
    correct_opt_id = quiz_data["questions"][0]["correct_opt_id"]
    res_save = client.post(
        f"/api/v1/attempts/{attempt_id}/autosave",
        json={"q_id": first_q_id, "selected_opt_id": correct_opt_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_save.status_code == 200

    # 7. Record telemetry tab switch
    res_telem = client.post(
        f"/api/v1/attempts/{attempt_id}/telemetry",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_telem.status_code == 200

    # 8. Submit attempt and evaluate
    res_sub = client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_sub.status_code == 200
    result_data = res_sub.json()
    assert result_data["attempt"]["status"] == "submitted"
    assert result_data["attempt"]["score"] is not None
    assert result_data["results_visible"] is True
    assert len(result_data["reviews"]) > 0

def test_analytics_and_csv_export(client):
    res_teacher = client.post("/api/v1/auth/login", json={
        "email": "e.vance@stanford.edu",
        "password": "password123",
    })
    token = res_teacher.json()["access_token"]

    res_ana = client.get("/api/v1/classrooms/cls_os_401/analytics", headers={"Authorization": f"Bearer {token}"})
    assert res_ana.status_code == 200
    data = res_ana.json()
    assert data["total_students"] > 0
    assert len(data["distribution"]) > 0

    res_csv = client.get("/api/v1/classrooms/cls_os_401/analytics/export-csv", headers={"Authorization": f"Bearer {token}"})
    assert res_csv.status_code == 200
    assert "Student Name" in res_csv.text

def test_doubt_chat_with_refusal(client):
    res_login = client.post("/api/v1/auth/login", json={
        "email": "a.rivera@stanford.edu",
        "password": "password123",
    })
    token = res_login.json()["access_token"]

    res_chat = client.post(
        "/api/v1/classrooms/cls_os_401/chat",
        json={"message": "What is the capital city of Australia?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_chat.status_code == 200
    data = res_chat.json()
    assert data["message"]["refusal"] is True
    assert "not covered in your uploaded classroom notes" in data["message"]["content"]
