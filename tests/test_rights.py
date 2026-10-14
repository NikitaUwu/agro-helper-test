"""Tests for permission and rights verification logic."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from plantdb.contracts import PermissionDecision, PermissionStatus, Purpose
from plantdb.rights import can_use


@pytest.fixture
def base_approved_decision():
    return PermissionDecision(
        rights_id=uuid4(),
        reviewer_id="reviewer_agronomist_1",
        reviewed_at=datetime.now(timezone.utc),
        evidence_ref="contracts/field_contract_01.pdf",
        status=PermissionStatus.APPROVED,
        attribution="Field Partner 1",
        can_store=True,
        can_display=True,
        can_transform=True,
        can_train=True,
        can_redistribute=True,
    )


def test_unknown_permission_blocks_export(base_approved_decision):
    """status=approved and can_train=None still yields can_use(commercial_ml)=False."""
    decision_with_unknown_train = base_approved_decision.model_copy(
        update={"can_train": None}
    )
    assert can_use(decision_with_unknown_train, Purpose.COMMERCIAL_ML) is False

    decision_with_unknown_store = base_approved_decision.model_copy(
        update={"can_store": None}
    )
    assert can_use(decision_with_unknown_store, Purpose.GALLERY) is False


def test_display_does_not_allow_training(base_approved_decision):
    """Having permission to display must never imply permission to train."""
    display_only_decision = base_approved_decision.model_copy(
        update={
            "can_display": True,
            "can_train": False,
            "can_transform": True,
            "can_redistribute": False,
        }
    )
    assert can_use(display_only_decision, Purpose.GALLERY) is True
    assert can_use(display_only_decision, Purpose.COMMERCIAL_ML) is False


def test_expired_permission_blocks_use(base_approved_decision):
    """Expired permission decisions must return False for all purposes."""
    past_date = datetime.now(timezone.utc) - timedelta(days=1)
    expired_decision = base_approved_decision.model_copy(
        update={"expires_at": past_date}
    )
    current_time = datetime.now(timezone.utc)

    assert can_use(expired_decision, Purpose.GALLERY, at=current_time) is False
    assert can_use(expired_decision, Purpose.COMMERCIAL_ML, at=current_time) is False


def test_withdrawn_permission_blocks_use(base_approved_decision):
    """status=withdrawn must immediately block all uses, even if individual flags were True."""
    withdrawn_decision = base_approved_decision.model_copy(
        update={"status": PermissionStatus.WITHDRAWN}
    )
    assert can_use(withdrawn_decision, Purpose.GALLERY) is False
    assert can_use(withdrawn_decision, Purpose.COMMERCIAL_ML) is False


def test_pending_or_rejected_blocks_use(base_approved_decision):
    """Pending or rejected decisions must block export."""
    pending_decision = base_approved_decision.model_copy(
        update={"status": PermissionStatus.PENDING}
    )
    assert can_use(pending_decision, Purpose.GALLERY) is False
    assert can_use(pending_decision, Purpose.COMMERCIAL_ML) is False

    rejected_decision = base_approved_decision.model_copy(
        update={"status": PermissionStatus.REJECTED}
    )
    assert can_use(rejected_decision, Purpose.GALLERY) is False
    assert can_use(rejected_decision, Purpose.COMMERCIAL_ML) is False
