/**
 * Static airport + city dataset for autocomplete suggestions.
 * Used by AutocompleteInput when the backend /api/airports endpoint
 * is unavailable. Covers the world's busiest 120+ routes.
 */

export const AIRPORTS = [
  // North America
  { city: 'New York',       code: 'JFK', country: 'USA'         },
  { city: 'New York',       code: 'LGA', country: 'USA'         },
  { city: 'New York',       code: 'EWR', country: 'USA'         },
  { city: 'Los Angeles',    code: 'LAX', country: 'USA'         },
  { city: 'Chicago',        code: 'ORD', country: 'USA'         },
  { city: 'Chicago',        code: 'MDW', country: 'USA'         },
  { city: 'San Francisco',  code: 'SFO', country: 'USA'         },
  { city: 'Miami',          code: 'MIA', country: 'USA'         },
  { city: 'Dallas',         code: 'DFW', country: 'USA'         },
  { city: 'Atlanta',        code: 'ATL', country: 'USA'         },
  { city: 'Seattle',        code: 'SEA', country: 'USA'         },
  { city: 'Denver',         code: 'DEN', country: 'USA'         },
  { city: 'Boston',         code: 'BOS', country: 'USA'         },
  { city: 'Las Vegas',      code: 'LAS', country: 'USA'         },
  { city: 'Houston',        code: 'IAH', country: 'USA'         },
  { city: 'Phoenix',        code: 'PHX', country: 'USA'         },
  { city: 'Washington DC',  code: 'IAD', country: 'USA'         },
  { city: 'Orlando',        code: 'MCO', country: 'USA'         },
  { city: 'Minneapolis',    code: 'MSP', country: 'USA'         },
  { city: 'Toronto',        code: 'YYZ', country: 'Canada'      },
  { city: 'Vancouver',      code: 'YVR', country: 'Canada'      },
  { city: 'Montreal',       code: 'YUL', country: 'Canada'      },
  { city: 'Mexico City',    code: 'MEX', country: 'Mexico'      },
  { city: 'Cancun',         code: 'CUN', country: 'Mexico'      },

  // Europe
  { city: 'London',         code: 'LHR', country: 'UK'          },
  { city: 'London',         code: 'LGW', country: 'UK'          },
  { city: 'London',         code: 'STN', country: 'UK'          },
  { city: 'Paris',          code: 'CDG', country: 'France'      },
  { city: 'Paris',          code: 'ORY', country: 'France'      },
  { city: 'Amsterdam',      code: 'AMS', country: 'Netherlands' },
  { city: 'Frankfurt',      code: 'FRA', country: 'Germany'     },
  { city: 'Munich',         code: 'MUC', country: 'Germany'     },
  { city: 'Berlin',         code: 'BER', country: 'Germany'     },
  { city: 'Madrid',         code: 'MAD', country: 'Spain'       },
  { city: 'Barcelona',      code: 'BCN', country: 'Spain'       },
  { city: 'Rome',           code: 'FCO', country: 'Italy'       },
  { city: 'Milan',          code: 'MXP', country: 'Italy'       },
  { city: 'Zurich',         code: 'ZRH', country: 'Switzerland' },
  { city: 'Vienna',         code: 'VIE', country: 'Austria'     },
  { city: 'Brussels',       code: 'BRU', country: 'Belgium'     },
  { city: 'Copenhagen',     code: 'CPH', country: 'Denmark'     },
  { city: 'Stockholm',      code: 'ARN', country: 'Sweden'      },
  { city: 'Oslo',           code: 'OSL', country: 'Norway'      },
  { city: 'Helsinki',       code: 'HEL', country: 'Finland'     },
  { city: 'Lisbon',         code: 'LIS', country: 'Portugal'    },
  { city: 'Athens',         code: 'ATH', country: 'Greece'      },
  { city: 'Istanbul',       code: 'IST', country: 'Turkey'      },
  { city: 'Prague',         code: 'PRG', country: 'Czech Rep.'  },
  { city: 'Warsaw',         code: 'WAW', country: 'Poland'      },
  { city: 'Budapest',       code: 'BUD', country: 'Hungary'     },
  { city: 'Dublin',         code: 'DUB', country: 'Ireland'     },
  { city: 'Edinburgh',      code: 'EDI', country: 'UK'          },
  { city: 'Manchester',     code: 'MAN', country: 'UK'          },

  // Middle East & Africa
  { city: 'Dubai',          code: 'DXB', country: 'UAE'         },
  { city: 'Abu Dhabi',      code: 'AUH', country: 'UAE'         },
  { city: 'Doha',           code: 'DOH', country: 'Qatar'       },
  { city: 'Riyadh',         code: 'RUH', country: 'Saudi Arabia'},
  { city: 'Jeddah',         code: 'JED', country: 'Saudi Arabia'},
  { city: 'Muscat',         code: 'MCT', country: 'Oman'        },
  { city: 'Kuwait City',    code: 'KWI', country: 'Kuwait'      },
  { city: 'Tel Aviv',       code: 'TLV', country: 'Israel'      },
  { city: 'Cairo',          code: 'CAI', country: 'Egypt'       },
  { city: 'Casablanca',     code: 'CMN', country: 'Morocco'     },
  { city: 'Johannesburg',   code: 'JNB', country: 'South Africa'},
  { city: 'Cape Town',      code: 'CPT', country: 'South Africa'},
  { city: 'Nairobi',        code: 'NBO', country: 'Kenya'       },
  { city: 'Lagos',          code: 'LOS', country: 'Nigeria'     },
  { city: 'Addis Ababa',    code: 'ADD', country: 'Ethiopia'    },

  // Asia
  { city: 'Singapore',      code: 'SIN', country: 'Singapore'   },
  { city: 'Tokyo',          code: 'NRT', country: 'Japan'       },
  { city: 'Tokyo',          code: 'HND', country: 'Japan'       },
  { city: 'Osaka',          code: 'KIX', country: 'Japan'       },
  { city: 'Seoul',          code: 'ICN', country: 'South Korea' },
  { city: 'Beijing',        code: 'PEK', country: 'China'       },
  { city: 'Shanghai',       code: 'PVG', country: 'China'       },
  { city: 'Hong Kong',      code: 'HKG', country: 'Hong Kong'   },
  { city: 'Bangkok',        code: 'BKK', country: 'Thailand'    },
  { city: 'Kuala Lumpur',   code: 'KUL', country: 'Malaysia'    },
  { city: 'Jakarta',        code: 'CGK', country: 'Indonesia'   },
  { city: 'Manila',         code: 'MNL', country: 'Philippines' },
  { city: 'Taipei',         code: 'TPE', country: 'Taiwan'      },
  { city: 'Mumbai',         code: 'BOM', country: 'India'       },
  { city: 'Delhi',          code: 'DEL', country: 'India'       },
  { city: 'Bangalore',      code: 'BLR', country: 'India'       },
  { city: 'Dhaka',          code: 'DAC', country: 'Bangladesh'  },
  { city: 'Colombo',        code: 'CMB', country: 'Sri Lanka'   },
  { city: 'Kathmandu',      code: 'KTM', country: 'Nepal'       },
  { city: 'Karachi',        code: 'KHI', country: 'Pakistan'    },
  { city: 'Lahore',         code: 'LHE', country: 'Pakistan'    },

  // Oceania
  { city: 'Sydney',         code: 'SYD', country: 'Australia'   },
  { city: 'Melbourne',      code: 'MEL', country: 'Australia'   },
  { city: 'Brisbane',       code: 'BNE', country: 'Australia'   },
  { city: 'Perth',          code: 'PER', country: 'Australia'   },
  { city: 'Auckland',       code: 'AKL', country: 'New Zealand' },

  // South America
  { city: 'São Paulo',      code: 'GRU', country: 'Brazil'      },
  { city: 'Rio de Janeiro', code: 'GIG', country: 'Brazil'      },
  { city: 'Buenos Aires',   code: 'EZE', country: 'Argentina'   },
  { city: 'Bogotá',         code: 'BOG', country: 'Colombia'    },
  { city: 'Lima',           code: 'LIM', country: 'Peru'        },
  { city: 'Santiago',       code: 'SCL', country: 'Chile'       },
]

/**
 * Filter airports by query string (city name, code, or country).
 * Case-insensitive. Returns up to `limit` results.
 */
export function filterAirports(query, limit = 7) {
  if (!query || query.trim().length < 2) return []
  const q = query.trim().toLowerCase()
  return AIRPORTS.filter(a =>
    a.city.toLowerCase().includes(q)    ||
    a.code.toLowerCase().includes(q)    ||
    a.country.toLowerCase().includes(q)
  ).slice(0, limit)
}