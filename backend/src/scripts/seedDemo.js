require('dotenv').config();
const { pool, query } = require('../config/db');
const User = require('../db/userModel');

const PASSWORD = 'Demo@1234';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const helpers = [
  {
    name: 'Asha Devi',
    email: 'asha@demo.com',
    city: 'Delhi',
    service: 'maid',
    years: 3,
    plans: ['hourly', 'monthly'],
    hourly: 150,
    monthly: 9000,
    yearly: null,
    skills: ['cleaning', 'cooking'],
    rating: 4.6,
    reviews: 12,
  },
  {
    name: 'Bina Rao',
    email: 'bina@demo.com',
    city: 'Gurugram',
    service: 'nanny',
    years: 7,
    plans: ['monthly', 'yearly'],
    hourly: null,
    monthly: 18000,
    yearly: 200000,
    skills: ['infant care', 'first aid'],
    rating: 4.9,
    reviews: 31,
  },
  {
    name: 'Chitra Sen',
    email: 'chitra@demo.com',
    city: 'Delhi',
    service: 'babysitter',
    years: 1,
    plans: ['hourly'],
    hourly: 250,
    monthly: null,
    yearly: null,
    skills: ['storytelling', 'homework help'],
    rating: 0,
    reviews: 0,
  },
];

async function createUser(name, email, role, city, phone) {
  const existing = await User.findByEmailWithPassword(email);
  if (existing) return existing.id;
  const user = await User.create({ name, email, password: PASSWORD, role, city, phone });
  return user.id;
}

(async () => {
  try {
    const householdId = await createUser(
      'Priya Sharma',
      'priya@demo.com',
      'household',
      'Delhi',
      '9810012345',
    );
    await query(
      `INSERT INTO household_profiles (user_id, address, pincode, family_size, children_count, has_pets)
       VALUES ($1, '12 MG Road, Delhi', '110001', 4, 2, FALSE)
       ON CONFLICT (user_id) DO NOTHING`,
      [householdId],
    );

    for (const h of helpers) {
      const userId = await createUser(h.name, h.email, 'helper', h.city, '9876500000');
      await query(
        `INSERT INTO helper_profiles
           (user_id, service_type, bio, experience_years, skills, languages, available_days,
            available_from, available_to, preferred_plans, hourly_rate, monthly_rate, yearly_rate,
            verification_status, verified_at, avg_rating, review_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, '08:00', '18:00', $8, $9, $10, $11, 'verified', NOW(), $12, $13)
         ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          h.service,
          `${h.name} has ${h.years} years of experience and is known for being punctual and careful.`,
          h.years,
          h.skills,
          ['Hindi', 'English'],
          DAYS,
          h.plans,
          h.hourly,
          h.monthly,
          h.yearly,
          h.rating,
          h.reviews,
        ],
      );
    }

    console.log('Demo data ready. Password for every demo account: ' + PASSWORD);
    console.log(
      'Household: priya@demo.com | Helpers: asha@demo.com, bina@demo.com, chitra@demo.com',
    );
  } catch (err) {
    console.error('Demo seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
