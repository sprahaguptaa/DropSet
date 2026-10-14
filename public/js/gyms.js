// data/gyms.js
// SAMPLE DATA for the demo. Gym names are real brands, but the cities,
// prices, hours and equipment below are made up. Do not treat them as facts.
//
// Every screen gets gyms through the Gyms object at the bottom, never from
// GYM_DATA directly. When Supabase is ready, rewrite the three functions in
// Gyms to fetch from the database and the screens won't need to change.

const GYM_DATA = [
  {
    id: 'crunch-phoenix',
    name: 'Crunch Fitness',
    area: 'Downtown',
    city: 'Phoenix',
    state: 'AZ',
    styles: ['General fitness', 'Cardio'],
    blurb: 'A big-floor gym with plenty of cardio and machines, good for a no-fuss workout.',
    passes: { day: 15, week: 35, month: 65 },
    hours: { weekday: '5:00 AM - 11:00 PM', weekend: '7:00 AM - 8:00 PM' },
    equipment: ['Cable machines', 'Dumbbells to 120 lb', 'Treadmills and bikes', 'Smith machines'],
    amenities: ['Lockers', 'Showers', 'Free parking']
  },
  {
    id: 'crunch-austin',
    name: 'Crunch Fitness',
    area: 'South Congress',
    city: 'Austin',
    state: 'TX',
    styles: ['General fitness', 'Bodybuilding'],
    blurb: 'Strong selection of plate-loaded machines and free weights for hypertrophy work.',
    passes: { day: 12, week: 30, month: 55 },
    hours: { weekday: '24 hours', weekend: '24 hours' },
    equipment: ['Plate-loaded machines', 'Dumbbells to 150 lb', 'Squat racks', 'Cable stations'],
    amenities: ['24-hour access', 'Lockers', 'Showers']
  },
  {
    id: 'lifetime-denver',
    name: 'Life Time',
    area: 'Cherry Creek',
    city: 'Denver',
    state: 'CO',
    styles: ['General fitness', 'Cardio'],
    blurb: 'A full-service athletic club with pools, classes and a quiet recovery area.',
    passes: { day: 45, week: 110, month: 210 },
    hours: { weekday: '5:00 AM - 10:00 PM', weekend: '6:00 AM - 8:00 PM' },
    equipment: ['Free weights to 150 lb', 'Squat racks', 'Cardio theater', 'Functional training zone'],
    amenities: ['Pool', 'Sauna', 'Group classes', 'Towel service', 'Cafe']
  },
  {
    id: 'lifetime-chicago',
    name: 'Life Time',
    area: 'West Loop',
    city: 'Chicago',
    state: 'IL',
    styles: ['General fitness', 'Powerlifting'],
    blurb: 'Premium club with a dedicated strength floor and platforms for heavy lifting.',
    passes: { day: 50, week: 125, month: 235 },
    hours: { weekday: '5:00 AM - 10:00 PM', weekend: '6:00 AM - 8:00 PM' },
    equipment: ['Lifting platforms', 'Competition barbells', 'Power racks', 'Dumbbells to 200 lb'],
    amenities: ['Pool', 'Sauna', 'Group classes', 'Towel service']
  },
  {
    id: 'golds-venice',
    name: "Gold's Gym",
    area: 'Venice',
    city: 'Los Angeles',
    state: 'CA',
    styles: ['Bodybuilding', 'Powerlifting'],
    blurb: 'Classic iron-focused gym with deep rows of free weights and heavy equipment.',
    passes: { day: 20, week: 50, month: 85 },
    hours: { weekday: '5:00 AM - 11:00 PM', weekend: '6:00 AM - 9:00 PM' },
    equipment: ['Deadlift platforms', 'Squat and bench racks', 'Dumbbells to 200 lb', 'Hammer Strength machines'],
    amenities: ['Lockers', 'Showers', 'Outdoor training area']
  },
  {
    id: 'golds-dallas',
    name: "Gold's Gym",
    area: 'Uptown',
    city: 'Dallas',
    state: 'TX',
    styles: ['Bodybuilding', 'General fitness'],
    blurb: 'Well-stocked free weight room with a wide range of machines and cardio.',
    passes: { day: 18, week: 45, month: 75 },
    hours: { weekday: '4:30 AM - 11:00 PM', weekend: '6:00 AM - 9:00 PM' },
    equipment: ['Free weights', 'Cable stations', 'Leg press and hack squat', 'Cardio floor'],
    amenities: ['Lockers', 'Showers', 'Tanning']
  },
  {
    id: 'eos-lasvegas',
    name: 'EoS Fitness',
    area: 'Summerlin',
    city: 'Las Vegas',
    state: 'NV',
    styles: ['General fitness', 'Cardio'],
    blurb: 'Large, bright gym with lots of cardio, classes and recovery extras.',
    passes: { day: 10, week: 25, month: 45 },
    hours: { weekday: '4:00 AM - 12:00 AM', weekend: '6:00 AM - 10:00 PM' },
    equipment: ['Cardio floor', 'Selectorized machines', 'Dumbbells to 100 lb', 'Functional rig'],
    amenities: ['Pool', 'Hydromassage', 'Group classes', 'Lockers']
  },
  {
    id: 'eos-scottsdale',
    name: 'EoS Fitness',
    area: 'North Scottsdale',
    city: 'Scottsdale',
    state: 'AZ',
    styles: ['General fitness', 'Bodybuilding'],
    blurb: 'Spacious strength area with plate-loaded machines alongside a full cardio floor.',
    passes: { day: 10, week: 25, month: 45 },
    hours: { weekday: '4:00 AM - 12:00 AM', weekend: '6:00 AM - 10:00 PM' },
    equipment: ['Plate-loaded machines', 'Free weights', 'Squat racks', 'Cardio floor'],
    amenities: ['Pool', 'Group classes', 'Lockers', 'Showers']
  },
  {
    // Made-up independent gym, here to show the CrossFit filter.
    id: 'ironworks-denver',
    name: 'Ironworks CrossFit',
    area: 'RiNo',
    city: 'Denver',
    state: 'CO',
    styles: ['CrossFit', 'Powerlifting'],
    blurb: 'Independent box with coached classes and open gym time for drop-ins.',
    passes: { day: 25, week: 60, month: 120 },
    hours: { weekday: '5:30 AM - 8:30 PM', weekend: '8:00 AM - 12:00 PM' },
    equipment: ['Rigs and pull-up bars', 'Olympic barbells', 'Rowers and bikes', 'Kettlebells', 'Lifting platforms'],
    amenities: ['Coached classes', 'Showers', 'Chalk allowed']
  }
];

const Gyms = {
  STYLES: ['Powerlifting', 'CrossFit', 'Bodybuilding', 'General fitness', 'Cardio'],

  // All functions are async on purpose, so swapping in a real database
  // later (which is also async) needs no changes in the screens.

  async get(id) {
    return GYM_DATA.find((g) => g.id === id) || null;
  },

  // filters: { query: 'text', style: 'CrossFit', maxDay: 20 }
  // maxDay of 0 or empty means no price limit.
  async search({ query = '', style = '', maxDay = 0 } = {}) {
    const q = query.trim().toLowerCase();
    return GYM_DATA
      .filter((g) => {
        const where = `${g.name} ${g.area} ${g.city} ${g.state}`.toLowerCase();
        if (q && !where.includes(q)) return false;
        if (style && !g.styles.includes(style)) return false;
        if (maxDay && g.passes.day > maxDay) return false;
        return true;
      })
      .sort((a, b) => a.passes.day - b.passes.day);
  }
};
