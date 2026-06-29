# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
ARBITER - AI Dispute Resolution
================================
Two parties in disagreement each put GEN into escrow and state their side of the
dispute, citing a public evidence URL. When both sides are in, the contract reads
both cases and the cited evidence, and the validator set agrees (Equivalence
Principle) who is in the right. The winner takes the whole pot. A genuine tie
refunds both sides. No human arbitrator, no appeal.

Lifecycle for a dispute:
    OPENED   -> claimant filed their case + evidence, staked, awaiting respondent
    JOINED   -> respondent filed their case + evidence, matched the stake, locked
    RULED    -> validators read both sides, ruled, pot paid (or tie -> refunded)
"""

from genlayer import *
from dataclasses import dataclass
import json
import typing


STATUS_OPENED = 0
STATUS_JOINED = 1
STATUS_RULED = 2

SIDE_NONE = 0
SIDE_CLAIMANT = 1
SIDE_RESPONDENT = 2


@allow_storage
@dataclass
class Dispute:
    claimant: Address
    respondent: Address
    topic: str
    claimant_case: str
    claimant_evidence: str
    respondent_case: str
    respondent_evidence: str
    stake: u256
    status: u8
    ruling: u8           # SIDE_CLAIMANT / SIDE_RESPONDENT / SIDE_NONE (tie)
    rationale: str


class Arbiter(gl.Contract):
    disputes: DynArray[Dispute]

    def __init__(self) -> None:
        pass

    @gl.public.write.payable
    def open_dispute(self, topic: str, my_case: str, evidence_url: str) -> int:
        """Claimant states the dispute, their case, cites evidence, and stakes."""
        if len(topic.strip()) == 0:
            raise gl.vm.UserError("a topic is required")
        if len(my_case.strip()) == 0:
            raise gl.vm.UserError("your case is required")
        stake = gl.message.value
        if stake == u256(0):
            raise gl.vm.UserError("you must stake GEN to open a dispute")
        d = self.disputes.append_new_get()
        d.claimant = gl.message.sender_address
        d.respondent = Address(bytes(20))
        d.topic = topic
        d.claimant_case = my_case
        d.claimant_evidence = evidence_url
        d.respondent_case = ""
        d.respondent_evidence = ""
        d.stake = stake
        d.status = u8(STATUS_OPENED)
        d.ruling = u8(SIDE_NONE)
        d.rationale = ""
        return len(self.disputes) - 1

    @gl.public.write.payable
    def join_dispute(self, dispute_id: int, my_case: str, evidence_url: str) -> None:
        """Respondent files their side, cites evidence, matches the stake."""
        d = self._get(dispute_id)
        if d.status != STATUS_OPENED:
            raise gl.vm.UserError("dispute is not open to join")
        if gl.message.sender_address == d.claimant:
            raise gl.vm.UserError("you cannot dispute yourself")
        if len(my_case.strip()) == 0:
            raise gl.vm.UserError("your case is required")
        if gl.message.value != d.stake:
            raise gl.vm.UserError("you must match the stake exactly")
        d.respondent = gl.message.sender_address
        d.respondent_case = my_case
        d.respondent_evidence = evidence_url
        d.status = u8(STATUS_JOINED)

    @gl.public.write
    def rule(self, dispute_id: int) -> None:
        """Convene the arbiter. The contract reads both cases and the cited
        evidence, and validators must agree who is in the right."""
        d = self._get(dispute_id)
        if d.status != STATUS_JOINED:
            raise gl.vm.UserError("both sides must be filed first")

        topic = d.topic
        c_case = d.claimant_case
        c_ev = d.claimant_evidence
        r_case = d.respondent_case
        r_ev = d.respondent_evidence

        def leader_fn() -> str:
            c_page = ""
            r_page = ""
            if len(c_ev.strip()) != 0:
                try:
                    c_page = gl.nondet.web.get(c_ev).body.decode("utf-8")[:3000]
                except Exception:
                    c_page = "(evidence unreachable)"
            if len(r_ev.strip()) != 0:
                try:
                    r_page = gl.nondet.web.get(r_ev).body.decode("utf-8")[:3000]
                except Exception:
                    r_page = "(evidence unreachable)"
            prompt = (
                f"Dispute topic: {topic}\n\n"
                f"CLAIMANT'S CASE:\n{c_case}\n"
                f"CLAIMANT'S EVIDENCE:\n{c_page}\n\n"
                f"RESPONDENT'S CASE:\n{r_case}\n"
                f"RESPONDENT'S EVIDENCE:\n{r_page}\n\n"
                "You are an impartial arbiter. Weigh both cases and their "
                "evidence. Decide who is in the right. Reply with ONLY JSON: "
                '{"winner": "CLAIMANT"} or {"winner": "RESPONDENT"} or '
                '{"winner": "TIE"} if genuinely balanced, plus a short "reason".'
            )
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            return self._ruling_of(leader_res.calldata)[0] == self._ruling_of(leader_fn())[0]

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        side, reason = self._ruling_of(result)
        d.ruling = u8(side)
        d.rationale = reason[:400]
        d.status = u8(STATUS_RULED)

        pot = d.stake + d.stake
        if side == SIDE_CLAIMANT:
            self._pay(d.claimant, pot)
        elif side == SIDE_RESPONDENT:
            self._pay(d.respondent, pot)
        else:
            # tie: refund each side their own stake
            self._pay(d.claimant, d.stake)
            self._pay(d.respondent, d.stake)

    # ------------------------------------------------------------------ views
    @gl.public.view
    def get_dispute_count(self) -> int:
        return len(self.disputes)

    @gl.public.view
    def get_dispute(self, dispute_id: int) -> dict:
        d = self._get(dispute_id)
        return {
            "claimant": d.claimant.as_hex,
            "respondent": d.respondent.as_hex,
            "topic": d.topic,
            "claimant_case": d.claimant_case,
            "claimant_evidence": d.claimant_evidence,
            "respondent_case": d.respondent_case,
            "respondent_evidence": d.respondent_evidence,
            "stake": str(d.stake),
            "status": int(d.status),
            "ruling": int(d.ruling),
            "rationale": d.rationale,
        }

    # -------------------------------------------------------------- internals
    def _get(self, dispute_id: int) -> Dispute:
        if dispute_id < 0 or dispute_id >= len(self.disputes):
            raise gl.vm.UserError("no such dispute")
        return self.disputes[dispute_id]

    def _ruling_of(self, result: typing.Any) -> tuple:
        data = result
        if isinstance(data, str):
            data = self._extract_json(data)
        if not isinstance(data, dict):
            return (SIDE_NONE, "")
        raw = str(data.get("winner", "")).strip().upper()
        reason = str(data.get("reason", ""))
        if raw == "CLAIMANT":
            return (SIDE_CLAIMANT, reason)
        if raw == "RESPONDENT":
            return (SIDE_RESPONDENT, reason)
        return (SIDE_NONE, reason)

    def _extract_json(self, text: str) -> typing.Any:
        try:
            return json.loads(text)
        except (ValueError, TypeError):
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, TypeError):
                return None
        return None

    def _pay(self, recipient: Address, amount: u256) -> None:
        if amount == u256(0):
            return
        _Payee(recipient).emit_transfer(value=amount)


@gl.evm.contract_interface
class _Payee:
    class View:
        pass

    class Write:
        pass
