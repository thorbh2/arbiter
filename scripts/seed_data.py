"""Seed ARBITER with real disputes on studionet (burner wallet = claimant).
Disputes remain in OPENED state (awaiting a respondent) since joining requires
a different address. This is genuine on-chain data."""
from pathlib import Path
from gltest_cli.config.general import get_general_config
from gltest_cli.config.user import load_user_config
from gltest import get_contract_factory, get_default_account

ROOT = Path(__file__).resolve().parents[1]
cfg = load_user_config(str(ROOT / "gltest.config.yaml"))
get_general_config().user_config = cfg

ADDR = "0x5203F6a5f2B397337858DEB41cbFa25252136BeA"
GEN = 10 ** 18

acct = get_default_account()
factory = get_contract_factory(contract_file_path=str(ROOT / "contracts" / "arbiter.py"))
contract = factory.build_contract(ADDR, account=acct)

disputes = [
    ("Freelance milestone — was the deliverable on time?",
     "I'm the client. The contract set a deadline of March 1. The repository's final commit is timestamped March 18, three weeks late, so I withheld the final payment.",
     "https://example.com",
     3.0),
    ("Refund dispute — was the product as described?",
     "I'm the buyer. The listing promised a 12-month warranty in writing, but the seller now refuses to honor it. The archived listing page still shows the warranty terms.",
     "https://example.com",
     2.0),
]

for topic, case, ev, stake in disputes:
    try:
        contract.open_dispute(args=[topic, case, ev]).transact(value=int(stake * GEN))
        print(f"opened: {topic[:45]} ({stake} GEN)", flush=True)
    except Exception as e:
        print(f"FAILED {topic[:30]}: {e}", flush=True)

print("count=" + str(contract.get_dispute_count().call()), flush=True)
