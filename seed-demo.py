
import sys
import os
from datetime import datetime, timedelta

# Add project root to path so we can import your existing modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Users, Journal
from passlib.context import CryptContext

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERNAME = "demo_user"
DEMO_PASSWORD = "demo_password_not_real"  # never exposed to frontend, just needs to exist

# ─────────────────────────────────────────────────────────────────────────────
# Realistic, varied journal entries — spread across ~3 months
# Mix of work stress, gym goals, relationships, gratitude, small wins, recurring worries
# ─────────────────────────────────────────────────────────────────────────────

DEMO_ENTRIES = [
    "Started a new design system project at work today. Felt overwhelmed looking at the scope but broke it into smaller tasks and that helped a lot. Proud of myself for not spiraling.",
    "Went to the gym for the first time in two weeks. Body felt heavy but I'm glad I showed up. Small win today.",
    "Had a really good call with mom. We talked for almost an hour about nothing in particular and it made me feel less alone.",
    "Work deadline got pushed up again. I'm starting to feel like I'm always playing catch up. Need to talk to my manager about workload.",
    "Tried meal prepping on Sunday and it actually saved me so much stress this week. Why did I not start this sooner.",
    "Couldn't sleep again last night, kept thinking about the presentation tomorrow. My mind just won't shut off sometimes.",
    "Presentation went better than expected! People actually asked good questions instead of sitting in silence. Relief.",
    "Feeling a bit disconnected from friends lately. Everyone's busy with their own lives. I should be the one to reach out more.",
    "Ran 5k without stopping for the first time. Legs are dead but I feel unstoppable right now.",
    "Spent the whole weekend doing nothing productive and honestly it was exactly what I needed. No guilt about it.",
    "Coworker took credit for an idea I brought up in the meeting. Annoyed but I don't think it's worth a confrontation. Letting it go.",
    "Grateful today for small things — good coffee, sunny weather, and finishing my book finally.",
    "Anxious about the project review next week. I keep imagining worst case scenarios even though there's no real reason to.",
    "Had dinner with an old friend I hadn't seen in a year. Felt like no time had passed at all. These are the relationships that matter.",
    "Missed the gym three days in a row. Feeling guilty but also just tired. Need to be kinder to myself about this.",
    "Got positive feedback from my manager today on the design system work. Validating after weeks of feeling unsure if I was on the right track.",
    "Still thinking about that comment my coworker made last week. I know I should drop it but it's stuck in my head.",
    "Started reading a new book about habits. Trying to be more intentional instead of just reactive with my time.",
    "Long week. Work, gym, errands, barely had time to breathe. Looking forward to a slow weekend.",
    "Realized I haven't called my best friend in almost a month. Texted her today, we're catching up this weekend. Don't want to lose touch.",
    "Finished the design system project today! Genuinely proud of how it turned out despite how stressed I was at the start.",
    "Quiet Sunday. Did laundry, cooked, journaled. Nothing exciting but peaceful in a good way.",
    "Work has been less stressful this week, finally caught up on everything. Strange how much lighter I feel.",
    "Went on a hike with friends. Hadn't realized how much I needed to be outside and away from screens.",
]

def seed_demo_account():
    db = SessionLocal()
    try:
        # Skip if demo user already exists
        existing = db.query(Users).filter(Users.username == DEMO_USERNAME).first()
        if existing:
            print(f"Demo user already exists (id={existing.id}). Skipping creation.")
            print("If you want fresh entries, delete the user manually and re-run this script.")
            return

        # Create demo user
        demo_user = Users(
            username=DEMO_USERNAME,
            hashed_password=bcrypt_context.hash(DEMO_PASSWORD),
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        print(f"Created demo user (id={demo_user.id})")

        # Seed journal entries with staggered dates across ~3 months
        base_date = datetime.utcnow() - timedelta(days=90)
        for i, entry_text in enumerate(DEMO_ENTRIES):
            entry_date = base_date + timedelta(days=i * 4)  # spread roughly every 4 days
            journal = Journal(
                content=entry_text,
                user_id=demo_user.id,
            )
            db.add(journal)
            db.flush()
            # Manually set created_at to backdate the entry (override default)
            journal.created_at = entry_date
            db.add(journal)

        db.commit()
        print(f"Seeded {len(DEMO_ENTRIES)} journal entries for demo user.")
        print("\nDone! Demo account is ready.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_account()