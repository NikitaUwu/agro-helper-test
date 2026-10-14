"""Rights checking and license validation module."""

from datetime import datetime, timezone

from plantdb.contracts import PermissionDecision, PermissionStatus, Purpose


def can_use(
    decision: PermissionDecision,
    purpose: Purpose,
    at: datetime | None = None,
) -> bool:
    """Determine whether an asset with the given permissions may be used for the target purpose.

    Rules:
    - Status must be strictly APPROVED. Any pending, rejected, or withdrawn decision yields False.
    - If expires_at is set, the evaluation timestamp must not exceed it.
    - None (unknown) permissions are never treated as granted.
    - GALLERY purpose requires: can_store=True, can_display=True.
    - COMMERCIAL_ML purpose requires: can_store=True, can_transform=True, can_train=True, can_redistribute=True.
    """
    if decision.status != PermissionStatus.APPROVED:
        return False

    current_time = at or datetime.now(timezone.utc)
    if decision.expires_at is not None:
        # Normalize timezone awareness if comparing
        eval_time = current_time
        expires = decision.expires_at
        if eval_time.tzinfo is None and expires.tzinfo is not None:
            eval_time = eval_time.replace(tzinfo=timezone.utc)
        elif eval_time.tzinfo is not None and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)

        if eval_time > expires:
            return False

    if purpose == Purpose.GALLERY:
        return decision.can_store is True and decision.display_allowed()

    if purpose == Purpose.MODEL_EVALUATION:
        return decision.can_store is True and decision.can_transform is True

    if purpose == Purpose.COMMERCIAL_ML:
        return (
            decision.can_store is True
            and decision.can_transform is True
            and decision.can_train is True
            and decision.can_redistribute is True
        )

    return False


# Helper method on PermissionDecision if convenient
setattr(
    PermissionDecision,
    "display_allowed",
    lambda self: self.can_display is True,
)
