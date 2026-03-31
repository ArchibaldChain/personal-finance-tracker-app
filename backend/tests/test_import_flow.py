import io


class TestUploadImport:
    def test_upload_chase_csv_returns_201(self, client, chase_csv_bytes):
        resp = client.post(
            "/imports",
            data={"source_name": "chase"},
            files={"file": ("chase.csv", io.BytesIO(chase_csv_bytes), "text/csv")},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["source_name"] == "chase"
        assert data["file_name"] == "chase.csv"
        assert data["status"] == "pending"
        assert data["total_rows"] == 3

    def test_upload_unknown_source_returns_400(self, client, chase_csv_bytes):
        resp = client.post(
            "/imports",
            data={"source_name": "unknownbank"},
            files={"file": ("test.csv", io.BytesIO(chase_csv_bytes), "text/csv")},
        )
        assert resp.status_code == 400
        assert "unknownbank" in resp.json()["detail"]


class TestProcessImport:
    def test_process_chase_creates_transactions(self, client, chase_csv_bytes):
        upload_resp = client.post(
            "/imports",
            data={"source_name": "chase"},
            files={"file": ("chase.csv", io.BytesIO(chase_csv_bytes), "text/csv")},
        )
        import_id = upload_resp.json()["id"]

        process_resp = client.post(f"/imports/{import_id}/process")
        assert process_resp.status_code == 200
        data = process_resp.json()
        assert data["parsed_rows"] == 3
        assert data["failed_rows"] == 0
        assert "processed" in data["status"]

        # Verify transactions were created
        tx_resp = client.get("/transactions?source_type=csv")
        assert tx_resp.json()["total"] == 3

    def test_process_bofa_creates_transactions(self, client, bofa_csv_bytes):
        upload_resp = client.post(
            "/imports",
            data={"source_name": "bofa"},
            files={"file": ("bofa.csv", io.BytesIO(bofa_csv_bytes), "text/csv")},
        )
        import_id = upload_resp.json()["id"]

        process_resp = client.post(f"/imports/{import_id}/process")
        assert process_resp.status_code == 200
        data = process_resp.json()
        assert data["parsed_rows"] == 3
        assert data["failed_rows"] == 0

    def test_process_nonexistent_returns_400(self, client):
        resp = client.post("/imports/99999/process")
        assert resp.status_code == 400

    def test_process_twice_returns_400(self, client, chase_csv_bytes):
        upload_resp = client.post(
            "/imports",
            data={"source_name": "chase"},
            files={"file": ("chase.csv", io.BytesIO(chase_csv_bytes), "text/csv")},
        )
        import_id = upload_resp.json()["id"]
        client.post(f"/imports/{import_id}/process")
        resp = client.post(f"/imports/{import_id}/process")
        assert resp.status_code == 400
        assert "already been processed" in resp.json()["detail"]

    def test_failed_rows_recorded(self, client):
        bad_csv = (
            b"Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n"
            b"BADDATE,01/16/2026,COFFEE,Food,Sale,-5.00,\n"
            b"01/16/2026,01/17/2026,AMAZON,Shopping,Sale,-29.99,\n"
        )
        upload_resp = client.post(
            "/imports",
            data={"source_name": "chase"},
            files={"file": ("bad.csv", io.BytesIO(bad_csv), "text/csv")},
        )
        import_id = upload_resp.json()["id"]
        process_resp = client.post(f"/imports/{import_id}/process")
        data = process_resp.json()
        assert data["failed_rows"] == 1
        assert data["parsed_rows"] == 1


class TestListImports:
    def test_list_empty(self, client):
        resp = client.get("/imports")
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    def test_list_after_upload(self, client, chase_csv_bytes):
        client.post(
            "/imports",
            data={"source_name": "chase"},
            files={"file": ("chase.csv", io.BytesIO(chase_csv_bytes), "text/csv")},
        )
        resp = client.get("/imports")
        assert resp.json()["total"] == 1

    def test_get_single_import(self, client, chase_csv_bytes):
        upload_resp = client.post(
            "/imports",
            data={"source_name": "chase"},
            files={"file": ("chase.csv", io.BytesIO(chase_csv_bytes), "text/csv")},
        )
        import_id = upload_resp.json()["id"]
        resp = client.get(f"/imports/{import_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == import_id

    def test_get_nonexistent_returns_404(self, client):
        resp = client.get("/imports/99999")
        assert resp.status_code == 404
