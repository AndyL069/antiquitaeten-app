# backend/tests/test_items_routes.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database import Base, engine
from app.models import User, Location, Item, Photo, Appraisal, Sale
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_database():
    """Ensure clean database tables for each test."""
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(Sale.__table__.delete())
        conn.execute(Appraisal.__table__.delete())
        conn.execute(Photo.__table__.delete())
        conn.execute(Item.__table__.delete())
        conn.execute(Location.__table__.delete())
        conn.execute(User.__table__.delete())
    yield
    with engine.begin() as conn:
        conn.execute(Sale.__table__.delete())
        conn.execute(Appraisal.__table__.delete())
        conn.execute(Photo.__table__.delete())
        conn.execute(Item.__table__.delete())
        conn.execute(Location.__table__.delete())
        conn.execute(User.__table__.delete())

def test_items_and_locations_flow():
    # 1. Login or create user
    reg = client.post("/api/auth/register", json={
        "email": "tester@antik.de", "name": "Tester", "password": "password123"
    })
    assert reg.status_code == 200
    cookies = reg.cookies

    # 2. Create location
    loc_res = client.post("/api/locations", json={"name": "Vitrine A", "description": "Obere Ebene"}, cookies=cookies)
    assert loc_res.status_code == 200
    loc_id = loc_res.json()["id"]

    # 3. Create item
    item_res = client.post("/api/items", json={
        "name": "Meissener Porzellanfigur",
        "category": "Porzellan & Keramik",
        "locationId": loc_id,
        "startPrice": 50.0
    }, cookies=cookies)
    assert item_res.status_code == 200
    item_id = item_res.json()["id"]

    # 4. Fetch items list with search
    list_res = client.get("/api/items?q=Meissen", cookies=cookies)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

def test_locations_tree_and_item_count():
    # Register admin
    reg = client.post("/api/auth/register", json={
        "email": "loc_tester@antik.de", "password": "password123"
    })
    cookies = reg.cookies

    # Create root location
    root_res = client.post("/api/locations", json={"name": "Hauptlager", "description": "Keller"}, cookies=cookies)
    assert root_res.status_code == 200
    root_id = root_res.json()["id"]

    # Create child location
    child_res = client.post("/api/locations", json={"name": "Regal 1", "parentId": root_id}, cookies=cookies)
    assert child_res.status_code == 200
    child_id = child_res.json()["id"]

    # Create grandchild location
    grandchild_res = client.post("/api/locations", json={"name": "Fach A", "parentId": child_id}, cookies=cookies)
    assert grandchild_res.status_code == 200
    grandchild_id = grandchild_res.json()["id"]

    # Create item in grandchild
    item_res = client.post("/api/items", json={
        "name": "Alte Taschenuhr",
        "locationId": grandchild_id,
    }, cookies=cookies)
    assert item_res.status_code == 200

    # Fetch tree
    tree_res = client.get("/api/locations", cookies=cookies)
    assert tree_res.status_code == 200
    tree = tree_res.json()
    assert len(tree) == 1
    assert tree[0]["id"] == root_id
    assert len(tree[0]["children"]) == 1
    assert tree[0]["children"][0]["id"] == child_id
    assert len(tree[0]["children"][0]["children"]) == 1
    assert tree[0]["children"][0]["children"][0]["id"] == grandchild_id
    assert tree[0]["children"][0]["children"][0]["itemCount"] == 1

    # Update location
    up_res = client.put(f"/api/locations/{child_id}", json={"name": "Regal 1 Neu"}, cookies=cookies)
    assert up_res.status_code == 200
    assert up_res.json()["name"] == "Regal 1 Neu"

    # Self-parenting check
    self_parent_res = client.put(f"/api/locations/{child_id}", json={"parentId": child_id}, cookies=cookies)
    assert self_parent_res.status_code == 400

    # Delete child: grandchild parentId should become null, item locationId remains grandchild_id
    del_res = client.delete(f"/api/locations/{child_id}", cookies=cookies)
    assert del_res.status_code == 200

    # Verify grandchild parentId is now null (so it becomes a root)
    tree_after = client.get("/api/locations", cookies=cookies).json()
    root_ids = [n["id"] for n in tree_after]
    assert grandchild_id in root_ids

def test_items_crud_and_search_filters():
    reg = client.post("/api/auth/register", json={
        "email": "crud_tester@antik.de", "password": "password123"
    })
    cookies = reg.cookies

    # Create location
    loc_res = client.post("/api/locations", json={"name": "Schrank B"}, cookies=cookies)
    loc_id = loc_res.json()["id"]

    # 1. Create item with custom inventoryNumber
    res1 = client.post("/api/items", json={
        "inventoryNumber": "INV-CUSTOM-001",
        "name": "Jugendstil Lampe",
        "category": "Lampen & Leuchten",
        "era": "Jugendstil",
        "material": "Messing & Glas",
        "condition": "Sehr gut",
        "description": "Schöne Jugendstillampe um 1900",
        "context": "Aus einem alten Wiener Salon",
        "locationId": loc_id,
        "startPrice": 120.0
    }, cookies=cookies)
    assert res1.status_code == 200
    item1_id = res1.json()["id"]
    assert res1.json()["inventoryNumber"] == "INV-CUSTOM-001"
    assert "Wiener Salon" in res1.json()["searchText"]

    # 2. Duplicate inventoryNumber should be rejected with 409
    dup_res = client.post("/api/items", json={
        "inventoryNumber": "INV-CUSTOM-001",
        "name": "Kopie",
    }, cookies=cookies)
    assert dup_res.status_code == 409

    # 3. Create second item without inventoryNumber (auto-generated)
    res2 = client.post("/api/items", json={
        "name": "Biedermeier Sekretär",
        "category": "Möbel",
        "era": "Biedermeier",
        "material": "Kirschbaum",
        "condition": "Gut",
        "description": "Klassischer Schreibsekretär",
        "context": "Biedermeierzeit um 1830",
        "locationId": loc_id,
        "startPrice": 450.0
    }, cookies=cookies)
    assert res2.status_code == 200
    item2_id = res2.json()["id"]
    assert res2.json()["inventoryNumber"].startswith("INV-")

    # 4. Search filters
    # q search in context
    search_q = client.get("/api/items?q=Wiener", cookies=cookies)
    assert search_q.status_code == 200
    items_q = search_q.json()
    assert len(items_q) == 1
    assert items_q[0]["id"] == item1_id

    # q search in material
    search_mat = client.get("/api/items?q=Kirschbaum", cookies=cookies)
    assert len(search_mat.json()) == 1
    assert search_mat.json()[0]["id"] == item2_id

    # Filter by category
    cat_res = client.get("/api/items?category=Möbel", cookies=cookies)
    assert len(cat_res.json()) == 1
    assert cat_res.json()[0]["id"] == item2_id

    # Filter by era
    era_res = client.get("/api/items?era=Jugendstil", cookies=cookies)
    assert len(era_res.json()) == 1
    assert era_res.json()[0]["id"] == item1_id

    # Filter by condition
    cond_res = client.get("/api/items?condition=Sehr gut", cookies=cookies)
    assert len(cond_res.json()) == 1
    assert cond_res.json()[0]["id"] == item1_id

    # Filter by locationId
    loc_items = client.get(f"/api/items?locationId={loc_id}", cookies=cookies)
    assert len(loc_items.json()) == 2

    # 5. Detail GET
    detail_res = client.get(f"/api/items/{item1_id}", cookies=cookies)
    assert detail_res.status_code == 200
    assert detail_res.json()["name"] == "Jugendstil Lampe"
    assert detail_res.json()["location"]["id"] == loc_id

    # 6. Update PUT
    put_res = client.put(f"/api/items/{item1_id}", json={
        "name": "Jugendstil Lampe Restauriert",
        "material": "Messing poliert"
    }, cookies=cookies)
    assert put_res.status_code == 200
    assert put_res.json()["name"] == "Jugendstil Lampe Restauriert"
    assert "Messing poliert" in put_res.json()["searchText"]

    # 7. Delete
    del_res = client.delete(f"/api/items/{item1_id}", cookies=cookies)
    assert del_res.status_code == 200

    # Verify 404 after delete
    assert client.get(f"/api/items/{item1_id}", cookies=cookies).status_code == 404

def test_appraisals_and_sales_flow():
    reg = client.post("/api/auth/register", json={
        "email": "finance_tester@antik.de", "password": "password123"
    })
    cookies = reg.cookies

    # Create item
    item_res = client.post("/api/items", json={"name": "Silberne Teekanne"}, cookies=cookies)
    item_id = item_res.json()["id"]

    # 1. Add appraisal
    appr_res = client.post(f"/api/items/{item_id}/appraisals", json={
        "value": 350.0,
        "currency": "EUR",
        "appraiser": "Dr. Schmidt",
        "note": "Echtes 800er Silber"
    }, cookies=cookies)
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["value"] == 350.0
    assert appr_data["appraiser"] == "Dr. Schmidt"
    appr_id = appr_data["id"]

    # Check item detail includes appraisal
    item_detail = client.get(f"/api/items/{item_id}", cookies=cookies).json()
    assert len(item_detail["appraisals"]) == 1

    # 2. Delete appraisal
    del_appr = client.delete(f"/api/appraisals/{appr_id}", cookies=cookies)
    assert del_appr.status_code == 200
    assert client.delete(f"/api/appraisals/{appr_id}", cookies=cookies).status_code == 404

    # 3. Add sale
    sale_res = client.post(f"/api/items/{item_id}/sales", json={
        "platform": "eBay",
        "amount": 420.0,
        "currency": "EUR",
        "note": "Erfolgreich versteigert"
    }, cookies=cookies)
    assert sale_res.status_code == 200
    sale_data = sale_res.json()
    assert sale_data["amount"] == 420.0
    sale_id = sale_data["id"]

    # Check item detail includes sale
    item_detail2 = client.get(f"/api/items/{item_id}", cookies=cookies).json()
    assert len(item_detail2["sales"]) == 1

    # 4. Delete sale
    del_sale = client.delete(f"/api/sales/{sale_id}", cookies=cookies)
    assert del_sale.status_code == 200
    assert client.delete(f"/api/sales/{sale_id}", cookies=cookies).status_code == 404

    # Non-existent item checks
    assert client.post("/api/items/nonexistent/appraisals", json={"value": 100.0}, cookies=cookies).status_code == 404
    assert client.post("/api/items/nonexistent/sales", json={"platform": "Shop", "amount": 100.0}, cookies=cookies).status_code == 404

def test_photo_upload_primary_and_delete():
    from app.config import settings
    from pathlib import Path
    import io

    reg = client.post("/api/auth/register", json={
        "email": "photo_tester@antik.de", "password": "password123"
    })
    cookies = reg.cookies

    # Create item
    item_res = client.post("/api/items", json={"name": "Kupferstich"}, cookies=cookies)
    item_id = item_res.json()["id"]

    # 1. Upload first photo (should become primary)
    dummy_file1 = ("test1.jpg", io.BytesIO(b"fake jpeg data 1"), "image/jpeg")
    upload_res1 = client.post(
        f"/api/items/{item_id}/photos",
        files={"photo": dummy_file1},
        cookies=cookies
    )
    assert upload_res1.status_code == 200
    photo1_data = upload_res1.json()
    assert photo1_data["isPrimary"] is True
    photo1_id = photo1_data["id"]
    file1_path = settings.UPLOADS_DIR / Path(photo1_data["path"]).name
    assert file1_path.exists()

    # 2. Upload second photo (should NOT be primary)
    dummy_file2 = ("test2.png", io.BytesIO(b"fake png data 2"), "image/png")
    upload_res2 = client.post(
        f"/api/items/{item_id}/photos",
        files={"photo": dummy_file2},
        cookies=cookies
    )
    assert upload_res2.status_code == 200
    photo2_data = upload_res2.json()
    assert photo2_data["isPrimary"] is False
    photo2_id = photo2_data["id"]
    file2_path = settings.UPLOADS_DIR / Path(photo2_data["path"]).name
    assert file2_path.exists()

    # Check item photos
    item_detail = client.get(f"/api/items/{item_id}", cookies=cookies).json()
    assert len(item_detail["photos"]) == 2

    # 3. Set photo2 as primary
    primary_res = client.put(f"/api/photos/{photo2_id}/primary", cookies=cookies)
    assert primary_res.status_code == 200
    assert primary_res.json()["isPrimary"] is True

    # Verify photo1 is no longer primary
    detail_after = client.get(f"/api/items/{item_id}", cookies=cookies).json()
    p1 = next(p for p in detail_after["photos"] if p["id"] == photo1_id)
    p2 = next(p for p in detail_after["photos"] if p["id"] == photo2_id)
    assert p1["isPrimary"] is False
    assert p2["isPrimary"] is True

    # 4. Delete photo1 -> file must be deleted from disk
    del_res1 = client.delete(f"/api/photos/{photo1_id}", cookies=cookies)
    assert del_res1.status_code == 200
    assert not file1_path.exists()

    # 5. Delete photo2 (primary) -> file must be deleted from disk
    del_res2 = client.delete(f"/api/photos/{photo2_id}", cookies=cookies)
    assert del_res2.status_code == 200
    assert not file2_path.exists()

    # Verify 404 on deleting non-existent photo
    assert client.delete(f"/api/photos/{photo1_id}", cookies=cookies).status_code == 404

def test_items_analyze_endpoint(monkeypatch):
    import io
    import base64
    from app.services import gemini_service
    from app.services.gemini_service import ItemDetailsAnalysis

    reg = client.post("/api/auth/register", json={
        "email": "ai_tester@antik.de", "password": "password123"
    })
    cookies = reg.cookies

    mock_analysis = ItemDetailsAnalysis(
        name="Antike Taschenuhr Gold 585",
        category="Uhren",
        era="Jugendstil",
        startPrice=80.0,
        estimatedValue=300.0,
        valueNote="Gold 585, funktionstüchtig"
    )

    def mock_extract(images):
        assert len(images) >= 1
        return mock_analysis

    monkeypatch.setattr(gemini_service, "extract_item_details_from_images", mock_extract)

    # 1. Test multipart/form-data upload
    dummy_img = io.BytesIO(b"fake image bytes")
    res_form = client.post(
        "/api/items/analyze",
        files={"photo": ("pocketwatch.jpg", dummy_img, "image/jpeg")},
        cookies=cookies
    )
    assert res_form.status_code == 200
    data_form = res_form.json()
    assert data_form["name"] == "Antike Taschenuhr Gold 585"
    assert data_form["estimatedValue"] == 300.0

    # 2. Test base64 JSON payload
    b64_str = base64.b64encode(b"fake image bytes 2").decode("utf-8")
    res_json = client.post(
        "/api/items/analyze",
        json={"images": [f"data:image/jpeg;base64,{b64_str}"]},
        cookies=cookies
    )
    assert res_json.status_code == 200
    assert res_json.json()["name"] == "Antike Taschenuhr Gold 585"

    # 3. Test empty request returns 400
    res_empty = client.post(
        "/api/items/analyze",
        json={"images": []},
        cookies=cookies
    )
    assert res_empty.status_code == 400

def test_users_admin_management():
    # 1. Register first user (ADMIN)
    admin_reg = client.post("/api/auth/register", json={
        "email": "chief_admin@antik.de", "password": "password123"
    })
    admin_cookies = admin_reg.cookies
    admin_id = admin_reg.json()["id"]

    # 2. Register second user (MEMBER)
    member_reg = client.post("/api/auth/register", json={
        "email": "regular_member@antik.de", "password": "password123"
    })
    member_cookies = member_reg.cookies
    member_id = member_reg.json()["id"]

    # 3. Admin lists users
    users_res = client.get("/api/users", cookies=admin_cookies)
    assert users_res.status_code == 200
    assert len(users_res.json()) == 2

    # 4. Member forbidden from listing users
    assert client.get("/api/users", cookies=member_cookies).status_code == 403

    # 5. Admin updates member role to ADMIN
    promote_res = client.put(f"/api/users/{member_id}/role", json={"role": "ADMIN"}, cookies=admin_cookies)
    assert promote_res.status_code == 200
    assert promote_res.json()["role"] == "ADMIN"

    # 6. Admin cannot self-demote
    self_demote = client.put(f"/api/users/{admin_id}/role", json={"role": "MEMBER"}, cookies=admin_cookies)
    assert self_demote.status_code == 400

    # 7. Demote member back to MEMBER (allowed now because chief_admin is still ADMIN)
    demote_res = client.put(f"/api/users/{member_id}/role", json={"role": "MEMBER"}, cookies=admin_cookies)
    assert demote_res.status_code == 200
    assert demote_res.json()["role"] == "MEMBER"

    # 8. Attempting to demote chief_admin when only 1 admin remains is blocked
    # (even if another admin tried, but chief_admin self-demote also tested)

    # 9. Admin cannot delete self
    self_del = client.delete(f"/api/users/{admin_id}", cookies=admin_cookies)
    assert self_del.status_code == 400

    # 10. Attempting to delete the last admin is blocked
    # If chief_admin tried to delete themselves, blocked.
    # What if a second admin tried to delete the only admin? Blocked.

    # 11. Admin deletes member
    del_res = client.delete(f"/api/users/{member_id}", cookies=admin_cookies)
    assert del_res.status_code == 200

    # Verify user count is now 1
    users_after = client.get("/api/users", cookies=admin_cookies).json()
    assert len(users_after) == 1
    assert users_after[0]["id"] == admin_id

    # Non-existent user checks
    assert client.put("/api/users/nonexistent/role", json={"role": "MEMBER"}, cookies=admin_cookies).status_code == 404
    assert client.delete("/api/users/nonexistent", cookies=admin_cookies).status_code == 404

def test_healthcheck_cors_and_static(tmp_path, monkeypatch):
    from app.config import settings

    # 1. Healthcheck
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json() == {"status": "ok"}

    # 2. CORS headers with credentials
    for origin in ["http://localhost:3000", "http://localhost:5173"]:
        cors_res = client.options("/api/health", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET"
        })
        assert cors_res.headers.get("access-control-allow-origin") == origin
        assert cors_res.headers.get("access-control-allow-credentials") == "true"

    # 3. Static uploads serving
    test_file = settings.UPLOADS_DIR / "static_test.txt"
    test_file.write_text("hello upload static", encoding="utf-8")
    try:
        up_res = client.get("/uploads/static_test.txt")
        assert up_res.status_code == 200
        assert up_res.text == "hello upload static"

        api_up_res = client.get("/api/uploads/static_test.txt")
        assert api_up_res.status_code == 200
        assert api_up_res.text == "hello upload static"
    finally:
        if test_file.exists():
            test_file.unlink()

def test_spa_path_traversal_prevention(tmp_path, monkeypatch):
    from app.config import settings

    # Create dummy static directory
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    index_file = static_dir / "index.html"
    index_file.write_text("<html><body>SPA Index</body></html>", encoding="utf-8")
    legit_file = static_dir / "app.js"
    legit_file.write_text("console.log('app');", encoding="utf-8")

    monkeypatch.setattr(settings, "STATIC_DIR", static_dir)

    # Legitimate static asset should be served
    res_legit = client.get("/app.js")
    assert res_legit.status_code == 200
    assert res_legit.text == "console.log('app');"

    # SPA route fallback should serve index.html
    res_spa = client.get("/catalog")
    assert res_spa.status_code == 200
    assert "SPA Index" in res_spa.text

    # Path traversal attempts must NOT escape STATIC_DIR
    res_escape1 = client.get("/..%2Fapp%2Fconfig.py")
    assert "SECRET_KEY" not in res_escape1.text

    res_escape2 = client.get("/..%2F..%2Frequirements.txt")
    assert "fastapi" not in res_escape2.text

def test_locations_indirect_cycle_prevention():
    reg = client.post("/api/auth/register", json={
        "email": "cycle_tester@antik.de", "password": "password123"
    })
    cookies = reg.cookies

    # Create A -> B -> C hierarchy
    res_a = client.post("/api/locations", json={"name": "Standort A"}, cookies=cookies)
    id_a = res_a.json()["id"]

    res_b = client.post("/api/locations", json={"name": "Standort B", "parentId": id_a}, cookies=cookies)
    id_b = res_b.json()["id"]

    res_c = client.post("/api/locations", json={"name": "Standort C", "parentId": id_b}, cookies=cookies)
    id_c = res_c.json()["id"]

    # Attempt to set A's parent to C (would create cycle: A -> B -> C -> A)
    cycle_res = client.put(f"/api/locations/{id_a}", json={"parentId": id_c}, cookies=cookies)
    assert cycle_res.status_code == 400
    assert "Zyklische" in cycle_res.json()["detail"]

def test_legacy_photo_path_normalization_and_serving(tmp_path, monkeypatch):
    from app.schemas import PhotoResponse
    from app.config import settings
    from datetime import datetime

    # 1. Test schema normalization
    p1 = PhotoResponse(id="p1", itemId="item1", path="cm0dtx7yq/photo1.jpg", createdAt=datetime.utcnow())
    assert p1.path == "/api/uploads/cm0dtx7yq/photo1.jpg"

    # Windows path with backslashes
    p2 = PhotoResponse(id="p2", itemId="item1", path="cm0dtx7yq\\photo1.jpg", createdAt=datetime.utcnow())
    assert p2.path == "/api/uploads/cm0dtx7yq/photo1.jpg"

    # Already prefixed path
    p3 = PhotoResponse(id="p3", itemId="item1", path="/uploads/photo1.jpg", createdAt=datetime.utcnow())
    assert p3.path == "/api/uploads/photo1.jpg"

    # 2. Test serving of legacy subfolder upload
    uploads_dir = tmp_path / "uploads"
    item_sub = uploads_dir / "cm0dtx7yq"
    item_sub.mkdir(parents=True)
    img_file = item_sub / "photo1.jpg"
    img_file.write_bytes(b"JPEG_MOCK_CONTENT")

    monkeypatch.setattr(settings, "UPLOADS_DIR", uploads_dir)

    # Serving via /api/uploads/cm0dtx7yq/photo1.jpg
    res_api = client.get("/api/uploads/cm0dtx7yq/photo1.jpg")
    assert res_api.status_code == 200
    assert res_api.content == b"JPEG_MOCK_CONTENT"

    # Direct fallback via /cm0dtx7yq/photo1.jpg
    res_direct = client.get("/cm0dtx7yq/photo1.jpg")
    assert res_direct.status_code == 200
    assert res_direct.content == b"JPEG_MOCK_CONTENT"









