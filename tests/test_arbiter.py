"""Tests for ARBITER (direct runner, no network)."""
from pathlib import Path

CONTRACT = str(Path(__file__).resolve().parents[1] / "contracts" / "arbiter.py")
GEN = 10 ** 18
OPENED = 0; JOINED = 1; RULED = 2


def _open(a, vm, who, topic="Late delivery", case="They delivered 3 weeks late", ev="https://example.com/contract", stake=3):
    vm.sender = who
    vm.value = stake * GEN
    did = a.open_dispute(topic, case, ev)
    vm.value = 0
    return did


def test_open_dispute(deploy, direct_vm, direct_alice):
    a = deploy(CONTRACT)
    did = _open(a, direct_vm, direct_alice)
    assert did == 0
    d = a.get_dispute(0)
    assert d["status"] == OPENED
    assert d["topic"] == "Late delivery"
    assert int(d["stake"]) == 3 * GEN


def test_open_requires_stake(deploy, direct_vm, direct_alice):
    a = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("must stake GEN"):
        a.open_dispute("topic", "case", "https://x.com")


def test_open_requires_case(deploy, direct_vm, direct_alice):
    a = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("your case is required"):
        a.open_dispute("topic", "  ", "https://x.com")
    direct_vm.value = 0


def test_join_dispute(deploy, direct_vm, direct_alice, direct_bob):
    a = deploy(CONTRACT)
    _open(a, direct_vm, direct_alice, stake=3)
    direct_vm.sender = direct_bob
    direct_vm.value = 3 * GEN
    a.join_dispute(0, "We delivered on the agreed date", "https://example.com/emails")
    direct_vm.value = 0
    d = a.get_dispute(0)
    assert d["status"] == JOINED
    assert d["respondent_case"] == "We delivered on the agreed date"


def test_join_must_match_stake(deploy, direct_vm, direct_alice, direct_bob):
    a = deploy(CONTRACT)
    _open(a, direct_vm, direct_alice, stake=3)
    direct_vm.sender = direct_bob
    direct_vm.value = 1 * GEN
    with direct_vm.expect_revert("match the stake"):
        a.join_dispute(0, "case", "https://x.com")
    direct_vm.value = 0


def test_cannot_dispute_self(deploy, direct_vm, direct_alice):
    a = deploy(CONTRACT)
    _open(a, direct_vm, direct_alice, stake=3)
    direct_vm.sender = direct_alice
    direct_vm.value = 3 * GEN
    with direct_vm.expect_revert("cannot dispute yourself"):
        a.join_dispute(0, "case", "https://x.com")
    direct_vm.value = 0


def test_cannot_join_twice(deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    a = deploy(CONTRACT)
    _open(a, direct_vm, direct_alice, stake=2)
    direct_vm.sender = direct_bob
    direct_vm.value = 2 * GEN
    a.join_dispute(0, "case b", "https://b.com")
    direct_vm.value = 0
    direct_vm.sender = direct_charlie
    direct_vm.value = 2 * GEN
    with direct_vm.expect_revert("not open to join"):
        a.join_dispute(0, "case c", "https://c.com")
    direct_vm.value = 0


def test_multiple_disputes(deploy, direct_vm, direct_alice):
    a = deploy(CONTRACT)
    _open(a, direct_vm, direct_alice, topic="Dispute A")
    _open(a, direct_vm, direct_alice, topic="Dispute B")
    assert a.get_dispute_count() == 2
    assert a.get_dispute(1)["topic"] == "Dispute B"
