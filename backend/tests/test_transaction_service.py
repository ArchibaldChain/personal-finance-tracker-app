import pytest


TRANSACTION_PAYLOAD = {
    "transaction_date": "2026-01-15",
    "amount": -12.50,
    "currency": "USD",
    "merchant_normalized": "Starbucks",
    "description": "Coffee",
    "source_type": "manual",
    "category": "Food",
    "subcategory": "Coffee / Tea",
}


class TestCreateTransaction:
    def test_create_returns_201(self, client):
        resp = client.post("/transactions", json=TRANSACTION_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] is not None
        assert data["merchant_normalized"] == "Starbucks"
        assert data["source_type"] == "manual"
        assert data["is_deleted"] is False

    def test_create_missing_required_field_returns_422(self, client):
        payload = {k: v for k, v in TRANSACTION_PAYLOAD.items() if k != "transaction_date"}
        resp = client.post("/transactions", json=payload)
        assert resp.status_code == 422

    def test_create_missing_amount_returns_422(self, client):
        payload = {k: v for k, v in TRANSACTION_PAYLOAD.items() if k != "amount"}
        resp = client.post("/transactions", json=payload)
        assert resp.status_code == 422


class TestListTransactions:
    def test_empty_list(self, client):
        resp = client.get("/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_returns_created_transaction(self, client):
        client.post("/transactions", json=TRANSACTION_PAYLOAD)
        resp = client.get("/transactions")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["merchant_normalized"] == "Starbucks"

    def test_pagination(self, client):
        for i in range(10):
            payload = {**TRANSACTION_PAYLOAD, "description": f"Transaction {i}"}
            client.post("/transactions", json=payload)

        resp = client.get("/transactions?page=1&page_size=5")
        data = resp.json()
        assert data["total"] == 10
        assert len(data["items"]) == 5
        assert data["page"] == 1

        resp2 = client.get("/transactions?page=2&page_size=5")
        data2 = resp2.json()
        assert len(data2["items"]) == 5
        assert data2["page"] == 2

    def test_filter_by_category(self, client):
        client.post("/transactions", json={**TRANSACTION_PAYLOAD, "category": "Food"})
        client.post("/transactions", json={**TRANSACTION_PAYLOAD, "category": "Shopping"})

        resp = client.get("/transactions?category=Food")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "Food"

    def test_filter_by_source_type(self, client):
        client.post("/transactions", json={**TRANSACTION_PAYLOAD, "source_type": "manual"})
        resp = client.get("/transactions?source_type=manual")
        data = resp.json()
        assert data["total"] == 1

        resp2 = client.get("/transactions?source_type=csv")
        data2 = resp2.json()
        assert data2["total"] == 0

    def test_search_by_merchant(self, client):
        client.post("/transactions", json={**TRANSACTION_PAYLOAD, "merchant_normalized": "Starbucks"})
        client.post("/transactions", json={**TRANSACTION_PAYLOAD, "merchant_normalized": "Amazon"})

        resp = client.get("/transactions?search=starbucks")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["merchant_normalized"] == "Starbucks"

    def test_deleted_not_in_list(self, client):
        resp = client.post("/transactions", json=TRANSACTION_PAYLOAD)
        tx_id = resp.json()["id"]
        client.delete(f"/transactions/{tx_id}")

        resp = client.get("/transactions")
        assert resp.json()["total"] == 0


class TestGetTransaction:
    def test_get_existing(self, client):
        resp = client.post("/transactions", json=TRANSACTION_PAYLOAD)
        tx_id = resp.json()["id"]
        resp2 = client.get(f"/transactions/{tx_id}")
        assert resp2.status_code == 200
        assert resp2.json()["id"] == tx_id

    def test_get_nonexistent_returns_404(self, client):
        resp = client.get("/transactions/99999")
        assert resp.status_code == 404


class TestUpdateTransaction:
    def test_patch_updates_only_provided_fields(self, client):
        resp = client.post("/transactions", json=TRANSACTION_PAYLOAD)
        tx_id = resp.json()["id"]

        patch_resp = client.patch(f"/transactions/{tx_id}", json={"notes": "Updated note"})
        assert patch_resp.status_code == 200
        data = patch_resp.json()
        assert data["notes"] == "Updated note"
        # Other fields should be unchanged
        assert data["merchant_normalized"] == "Starbucks"
        assert data["category"] == "Food"

    def test_patch_nonexistent_returns_404(self, client):
        resp = client.patch("/transactions/99999", json={"notes": "test"})
        assert resp.status_code == 404


class TestDeleteTransaction:
    def test_soft_delete_returns_204(self, client):
        resp = client.post("/transactions", json=TRANSACTION_PAYLOAD)
        tx_id = resp.json()["id"]
        del_resp = client.delete(f"/transactions/{tx_id}")
        assert del_resp.status_code == 204

    def test_deleted_transaction_returns_404_on_get(self, client):
        resp = client.post("/transactions", json=TRANSACTION_PAYLOAD)
        tx_id = resp.json()["id"]
        client.delete(f"/transactions/{tx_id}")
        get_resp = client.get(f"/transactions/{tx_id}")
        assert get_resp.status_code == 404

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete("/transactions/99999")
        assert resp.status_code == 404
