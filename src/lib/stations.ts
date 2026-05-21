import { hitungJarak } from './emisi'

export type TransitType = 'mrt' | 'krl' | 'tj' | 'lrt'

export type Station = {
  id: string
  name: string
  lat: number
  lon: number
  type: TransitType
  /** ID stasiun lain yang terhubung (transfer) di lokasi/titik yang sama/berdekatan */
  transfers?: string[]
}

export const STATIONS: Station[] = [

  // ─────────────────────────────────────────────
  // MRT JAKARTA — Fase 1 (Lebak Bulus ↔ Bundaran HI)
  // ─────────────────────────────────────────────
  { id: 'mrt-lebakbulus',  name: 'MRT Lebak Bulus Grab',      lat: -6.2894, lon: 106.7742, type: 'mrt' },
  { id: 'mrt-fatmawati',  name: 'MRT Fatmawati Indomaret',    lat: -6.2934, lon: 106.7941, type: 'mrt' },
  { id: 'mrt-cipetemraya', name: 'MRT Cipete Raya',           lat: -6.2822, lon: 106.7971, type: 'mrt' },
  { id: 'mrt-hajinawi',   name: 'MRT Haji Nawi',              lat: -6.2699, lon: 106.7980, type: 'mrt' },
  { id: 'mrt-bloka',      name: 'MRT Blok A',                 lat: -6.2601, lon: 106.7981, type: 'mrt' },
  { id: 'mrt-blokmbca',   name: 'MRT Blok M BCA',             lat: -6.2442, lon: 106.7990, type: 'mrt' },
  { id: 'mrt-asean',      name: 'MRT ASEAN',                  lat: -6.2354, lon: 106.8002, type: 'mrt' },
  { id: 'mrt-senayan',    name: 'MRT Senayan Mastercard',     lat: -6.2267, lon: 106.8016, type: 'mrt' },
  { id: 'mrt-istora',     name: 'MRT Istora Mandiri',         lat: -6.2218, lon: 106.8082, type: 'mrt' },
  { id: 'mrt-benhil',     name: 'MRT Bendungan Hilir',        lat: -6.2149, lon: 106.8152, type: 'mrt' },
  { id: 'mrt-setiabudi',  name: 'MRT Setiabudi Astra',        lat: -6.2077, lon: 106.8220, type: 'mrt', transfers: ['lrt-setiabudi'] },
  { id: 'mrt-dukuh',      name: 'MRT Dukuh Atas BNI',         lat: -6.2010, lon: 106.8225, type: 'mrt', transfers: ['krl-sudirman', 'lrt-dukuhatas'] },
  { id: 'mrt-hi',         name: 'MRT Bundaran HI Bank DKI',   lat: -6.1925, lon: 106.8227, type: 'mrt' },

  // MRT Fase 2A (Bundaran HI → Kota) — beroperasi 2025
  { id: 'mrt-thamrin',    name: 'MRT Thamrin',                lat: -6.1869, lon: 106.8230, type: 'mrt' },
  { id: 'mrt-monasmrt',   name: 'MRT Monas',                  lat: -6.1769, lon: 106.8241, type: 'mrt' },
  { id: 'mrt-harmoni',    name: 'MRT Harmoni',                lat: -6.1666, lon: 106.8147, type: 'mrt' },
  { id: 'mrt-sawahbesar', name: 'MRT Sawah Besar',            lat: -6.1561, lon: 106.8201, type: 'mrt' },
  { id: 'mrt-mangabesar', name: 'MRT Mangga Besar',           lat: -6.1489, lon: 106.8200, type: 'mrt' },
  { id: 'mrt-jakartakotamrt', name: 'MRT Jakarta Kota',       lat: -6.1376, lon: 106.8131, type: 'mrt', transfers: ['krl-jakartakota'] },

  // ─────────────────────────────────────────────
  // LRT JABODEBEK
  // ─────────────────────────────────────────────
  { id: 'lrt-dukuhatas',      name: 'LRT Dukuh Atas',         lat: -6.2007, lon: 106.8228, type: 'lrt', transfers: ['mrt-dukuh', 'krl-sudirman'] },
  { id: 'lrt-setiabudi',      name: 'LRT Setiabudi',          lat: -6.2074, lon: 106.8266, type: 'lrt', transfers: ['mrt-setiabudi'] },
  { id: 'lrt-rasunasaid',     name: 'LRT Rasuna Said',        lat: -6.2149, lon: 106.8307, type: 'lrt' },
  { id: 'lrt-kuningan',       name: 'LRT Kuningan',           lat: -6.2230, lon: 106.8308, type: 'lrt' },
  { id: 'lrt-pancoran',       name: 'LRT Pancoran',           lat: -6.2471, lon: 106.8448, type: 'lrt' },
  { id: 'lrt-cikoko',         name: 'LRT Cikoko',             lat: -6.2580, lon: 106.8533, type: 'lrt' },
  { id: 'lrt-ciliwung',       name: 'LRT Ciliwung',           lat: -6.2630, lon: 106.8567, type: 'lrt' },
  { id: 'lrt-cawang',         name: 'LRT Cawang (Transit)',   lat: -6.2682, lon: 106.8611, type: 'lrt' },
  // Lini Cibubur
  { id: 'lrt-tmii',           name: 'LRT TMII',               lat: -6.2882, lon: 106.8773, type: 'lrt' },
  { id: 'lrt-kampungrambutan',name: 'LRT Kampung Rambutan',   lat: -6.3015, lon: 106.8857, type: 'lrt' },
  { id: 'lrt-ciracas',        name: 'LRT Ciracas',            lat: -6.3241, lon: 106.8888, type: 'lrt' },
  { id: 'lrt-harjamukti',     name: 'LRT Harjamukti',         lat: -6.3717, lon: 106.8795, type: 'lrt' },
  // Lini Bekasi
  { id: 'lrt-halim',          name: 'LRT Halim',              lat: -6.2639, lon: 106.8910, type: 'lrt' },
  { id: 'lrt-jatibening',     name: 'LRT Jatibening Baru',    lat: -6.2641, lon: 106.9192, type: 'lrt' },
  { id: 'lrt-cikunir1',       name: 'LRT Cikunir 1',          lat: -6.2624, lon: 106.9339, type: 'lrt' },
  { id: 'lrt-cikunir2',       name: 'LRT Cikunir 2',          lat: -6.2617, lon: 106.9469, type: 'lrt' },
  { id: 'lrt-bekasibarat',    name: 'LRT Bekasi Barat',       lat: -6.2492, lon: 106.9792, type: 'lrt', transfers: ['krl-bekasi'] },
  { id: 'lrt-jatimulya',      name: 'LRT Jati Mulya',         lat: -6.2445, lon: 107.0156, type: 'lrt' },

  // ─────────────────────────────────────────────
  // KRL — Lin Bogor (Jakarta Kota ↔ Bogor/Nambo)
  // ─────────────────────────────────────────────
  { id: 'krl-jakartakota',  name: 'KRL Jakarta Kota',         lat: -6.1376, lon: 106.8146, type: 'krl', transfers: ['mrt-jakartakotamrt'] },
  { id: 'krl-jayakarta',    name: 'KRL Jayakarta',            lat: -6.1434, lon: 106.8219, type: 'krl' },
  { id: 'krl-mangabesar',   name: 'KRL Mangga Besar',         lat: -6.1484, lon: 106.8225, type: 'krl' },
  { id: 'krl-sawahbesar',   name: 'KRL Sawah Besar',          lat: -6.1557, lon: 106.8231, type: 'krl' },
  { id: 'krl-juanda',       name: 'KRL Juanda',               lat: -6.1626, lon: 106.8299, type: 'krl' },
  { id: 'krl-gambir',       name: 'KRL Gambir',               lat: -6.1767, lon: 106.8309, type: 'krl' },
  { id: 'krl-gondangdia',   name: 'KRL Gondangdia',           lat: -6.1863, lon: 106.8337, type: 'krl' },
  { id: 'krl-cikini',       name: 'KRL Cikini',               lat: -6.1957, lon: 106.8418, type: 'krl' },
  { id: 'krl-manggarai',    name: 'KRL Manggarai',            lat: -6.2099, lon: 106.8497, type: 'krl' },
  { id: 'krl-tebet',        name: 'KRL Tebet',                lat: -6.2270, lon: 106.8530, type: 'krl' },
  { id: 'krl-cawangkrl',    name: 'KRL Cawang',               lat: -6.2543, lon: 106.8620, type: 'krl' },
  { id: 'krl-durenkalibata',name: 'KRL Duren Kalibata',       lat: -6.2606, lon: 106.8542, type: 'krl' },
  { id: 'krl-pasar-minggu-baru', name: 'KRL Pasar Minggu Baru', lat: -6.2997, lon: 106.8421, type: 'krl' },
  { id: 'krl-pasarminggu',  name: 'KRL Pasar Minggu',         lat: -6.3085, lon: 106.8438, type: 'krl' },
  { id: 'krl-tanjungbarat', name: 'KRL Tanjung Barat',        lat: -6.3334, lon: 106.8299, type: 'krl' },
  { id: 'krl-lentengagung', name: 'KRL Lenteng Agung',        lat: -6.3516, lon: 106.8248, type: 'krl' },
  { id: 'krl-univpancasila',name: 'KRL Universitas Pancasila',lat: -6.3400, lon: 106.8310, type: 'krl' },
  { id: 'krl-uibarat',      name: 'KRL UI',                   lat: -6.3648, lon: 106.8199, type: 'krl' },
  { id: 'krl-pondokcina',   name: 'KRL Pondok Cina',          lat: -6.3700, lon: 106.8195, type: 'krl' },
  { id: 'krl-depokbaru',    name: 'KRL Depok Baru',           lat: -6.3774, lon: 106.8221, type: 'krl' },
  { id: 'krl-depok',        name: 'KRL Depok',                lat: -6.3934, lon: 106.8183, type: 'krl' },
  { id: 'krl-citayam',      name: 'KRL Citayam',              lat: -6.4135, lon: 106.8387, type: 'krl' },
  { id: 'krl-bojonggede',   name: 'KRL Bojonggede',           lat: -6.4706, lon: 106.8140, type: 'krl' },
  { id: 'krl-cilebut',      name: 'KRL Cilebut',              lat: -6.5101, lon: 106.8131, type: 'krl' },
  { id: 'krl-bogor',        name: 'KRL Bogor',                lat: -6.5950, lon: 106.7892, type: 'krl' },
  // Cabang Nambo
  { id: 'krl-pondokrajeg',  name: 'KRL Pondok Rajeg',         lat: -6.4521, lon: 106.8413, type: 'krl' },
  { id: 'krl-cibinong',     name: 'KRL Cibinong',             lat: -6.4716, lon: 106.8526, type: 'krl' },
  { id: 'krl-nambo',        name: 'KRL Nambo',                lat: -6.4366, lon: 106.9097, type: 'krl' },

  // ─────────────────────────────────────────────
  // KRL — Lin Lingkar Cikarang (Cikarang ↔ Jakarta Kota)
  // ─────────────────────────────────────────────
  { id: 'krl-angke',        name: 'KRL Angke',                lat: -6.1432, lon: 106.7979, type: 'krl' },
  { id: 'krl-rajawali',     name: 'KRL Rajawali',             lat: -6.1455, lon: 106.8341, type: 'krl' },
  { id: 'krl-kemayoran',    name: 'KRL Kemayoran',            lat: -6.1620, lon: 106.8385, type: 'krl' },
  { id: 'krl-pasarsenen',   name: 'KRL Pasar Senen',          lat: -6.1748, lon: 106.8443, type: 'krl' },
  { id: 'krl-gangsentiong', name: 'KRL Gang Sentiong',        lat: -6.1856, lon: 106.8517, type: 'krl' },
  { id: 'krl-kramat',       name: 'KRL Kramat',               lat: -6.1947, lon: 106.8569, type: 'krl' },
  { id: 'krl-pondokjati',   name: 'KRL Pondok Jati',          lat: -6.2089, lon: 106.8631, type: 'krl' },
  { id: 'krl-karet',        name: 'KRL Karet',                lat: -6.2014, lon: 106.8164, type: 'krl' },
  { id: 'krl-bnicity',      name: 'KRL BNI City',             lat: -6.2023, lon: 106.8193, type: 'krl' },
  { id: 'krl-sudirman',     name: 'KRL Sudirman',             lat: -6.2024, lon: 106.8230, type: 'krl', transfers: ['mrt-dukuh', 'lrt-dukuhatas'] },
  { id: 'krl-matraman',     name: 'KRL Matraman',             lat: -6.2114, lon: 106.8576, type: 'krl' },
  { id: 'krl-jatinegara',   name: 'KRL Jatinegara',           lat: -6.2150, lon: 106.8708, type: 'krl' },
  { id: 'krl-klender',      name: 'KRL Klender',              lat: -6.2192, lon: 106.9003, type: 'krl' },
  { id: 'krl-buaran',       name: 'KRL Buaran',               lat: -6.2203, lon: 106.9152, type: 'krl' },
  { id: 'krl-klenderbaru',  name: 'KRL Klender Baru',         lat: -6.2224, lon: 106.9285, type: 'krl' },
  { id: 'krl-cakung',       name: 'KRL Cakung',               lat: -6.2188, lon: 106.9468, type: 'krl' },
  { id: 'krl-kranji',       name: 'KRL Kranji',               lat: -6.2238, lon: 106.9749, type: 'krl' },
  { id: 'krl-bekasi',       name: 'KRL Bekasi',               lat: -6.2375, lon: 106.9926, type: 'krl', transfers: ['lrt-bekasibarat'] },
  { id: 'krl-bekasitimur',  name: 'KRL Bekasi Timur',         lat: -6.2351, lon: 107.0194, type: 'krl' },
  { id: 'krl-tambun',       name: 'KRL Tambun',               lat: -6.2300, lon: 107.0623, type: 'krl' },
  { id: 'krl-cibitung',     name: 'KRL Cibitung',             lat: -6.2279, lon: 107.1007, type: 'krl' },
  { id: 'krl-metland',      name: 'KRL Metland Telaga Murni', lat: -6.2536, lon: 107.1235, type: 'krl' },
  { id: 'krl-cikarang',     name: 'KRL Cikarang',             lat: -6.2560, lon: 107.1434, type: 'krl' },

  // ─────────────────────────────────────────────
  // KRL — Lin Rangkasbitung (Tanah Abang ↔ Rangkasbitung)
  // ─────────────────────────────────────────────
  { id: 'krl-tanahabang',   name: 'KRL Tanah Abang',          lat: -6.1856, lon: 106.8105, type: 'krl' },
  { id: 'krl-palmerah',     name: 'KRL Palmerah',             lat: -6.2007, lon: 106.7977, type: 'krl' },
  { id: 'krl-kebayoran',    name: 'KRL Kebayoran',            lat: -6.2413, lon: 106.7821, type: 'krl' },
  { id: 'krl-pondokranji',  name: 'KRL Pondok Ranji',         lat: -6.2707, lon: 106.7477, type: 'krl' },
  { id: 'krl-jurangmangu',  name: 'KRL Jurangmangu',          lat: -6.2878, lon: 106.7301, type: 'krl' },
  { id: 'krl-sudimara',     name: 'KRL Sudimara',             lat: -6.2935, lon: 106.7231, type: 'krl' },
  { id: 'krl-rawa-buntu',   name: 'KRL Rawa Buntu',           lat: -6.3132, lon: 106.7069, type: 'krl' },
  { id: 'krl-serpong',      name: 'KRL Serpong',              lat: -6.3268, lon: 106.6734, type: 'krl' },
  { id: 'krl-cisauk',       name: 'KRL Cisauk',               lat: -6.3478, lon: 106.6430, type: 'krl' },
  { id: 'krl-cicayur',      name: 'KRL Cicayur',              lat: -6.3408, lon: 106.6231, type: 'krl' },
  { id: 'krl-parungpanjang',name: 'KRL Parung Panjang',       lat: -6.3453, lon: 106.5649, type: 'krl' },
  { id: 'krl-cilejit',      name: 'KRL Cilejit',              lat: -6.3458, lon: 106.5292, type: 'krl' },
  { id: 'krl-daru',         name: 'KRL Daru',                 lat: -6.3382, lon: 106.4913, type: 'krl' },
  { id: 'krl-tenjo',        name: 'KRL Tenjo',                lat: -6.3354, lon: 106.5078, type: 'krl' },
  { id: 'krl-tigaraksa',    name: 'KRL Tigaraksa',            lat: -6.3228, lon: 106.4765, type: 'krl' },
  { id: 'krl-cikoya',       name: 'KRL Cikoya',               lat: -6.3150, lon: 106.4526, type: 'krl' },
  { id: 'krl-maja',         name: 'KRL Maja',                 lat: -6.3314, lon: 106.3986, type: 'krl' },
  { id: 'krl-citeras',      name: 'KRL Citeras',              lat: -6.3496, lon: 106.3263, type: 'krl' },
  { id: 'krl-rangkasbitung',name: 'KRL Rangkasbitung',        lat: -6.3604, lon: 106.2527, type: 'krl' },

  // ─────────────────────────────────────────────
  // KRL — Lin Tangerang (Duri ↔ Tangerang)
  // ─────────────────────────────────────────────
  { id: 'krl-duri',         name: 'KRL Duri',                 lat: -6.1723, lon: 106.8016, type: 'krl' },
  { id: 'krl-grogol',       name: 'KRL Grogol',               lat: -6.1664, lon: 106.7868, type: 'krl' },
  { id: 'krl-pesing',       name: 'KRL Pesing',               lat: -6.1680, lon: 106.7732, type: 'krl' },
  { id: 'krl-tamankota',    name: 'KRL Taman Kota',           lat: -6.1601, lon: 106.7628, type: 'krl' },
  { id: 'krl-bojongindah',  name: 'KRL Bojong Indah',         lat: -6.1731, lon: 106.7530, type: 'krl' },
  { id: 'krl-rawabuaya',    name: 'KRL Rawa Buaya',           lat: -6.1643, lon: 106.7380, type: 'krl' },
  { id: 'krl-kalideres',    name: 'KRL Kalideres',            lat: -6.1558, lon: 106.7027, type: 'krl' },
  { id: 'krl-poris',        name: 'KRL Poris',                lat: -6.1755, lon: 106.7349, type: 'krl' },
  { id: 'krl-batu-ceper',   name: 'KRL Batu Ceper',           lat: -6.1724, lon: 106.7204, type: 'krl' },
  { id: 'krl-tanahtinggi',  name: 'KRL Tanah Tinggi',         lat: -6.1738, lon: 106.6481, type: 'krl' },
  { id: 'krl-tangerang',    name: 'KRL Tangerang',            lat: -6.1779, lon: 106.6315, type: 'krl' },

  // ─────────────────────────────────────────────
  // KRL — Lin Tanjung Priok (Jakarta Kota ↔ Tanjung Priok)
  // ─────────────────────────────────────────────
  { id: 'krl-kampungbandan',name: 'KRL Kampung Bandan',       lat: -6.1295, lon: 106.8173, type: 'krl' },
  { id: 'krl-ancol',        name: 'KRL Ancol',                lat: -6.1259, lon: 106.8389, type: 'krl' },
  { id: 'krl-tanjungpriok', name: 'KRL Tanjung Priok',        lat: -6.1103, lon: 106.8743, type: 'krl' },

  // ─────────────────────────────────────────────
  // TRANSJAKARTA — Halte Utama (representatif per koridor)
  // ─────────────────────────────────────────────
  { id: 'tj-blokm',         name: 'TJ Blok M',                lat: -6.2444, lon: 106.7990, type: 'tj' },
  { id: 'tj-harmoni',       name: 'TJ Harmoni',               lat: -6.1666, lon: 106.8147, type: 'tj' },
  { id: 'tj-monas',         name: 'TJ Monas',                 lat: -6.1764, lon: 106.8223, type: 'tj' },
  { id: 'tj-semanggi',      name: 'TJ Semanggi',              lat: -6.2208, lon: 106.8151, type: 'tj' },
  { id: 'tj-grogol',        name: 'TJ Grogol',                lat: -6.1662, lon: 106.7891, type: 'tj' },
  { id: 'tj-slipi',         name: 'TJ Slipi Petamburan',      lat: -6.1950, lon: 106.7980, type: 'tj' },
  { id: 'tj-kuningan',      name: 'TJ Kuningan Timur',        lat: -6.2392, lon: 106.8310, type: 'tj' },
  { id: 'tj-cawang',        name: 'TJ Cawang UKI',            lat: -6.2505, lon: 106.8732, type: 'tj' },
  { id: 'tj-kp-rambutan',   name: 'TJ Kampung Rambutan',      lat: -6.3090, lon: 106.8821, type: 'tj' },
  { id: 'tj-ragunan',       name: 'TJ Ragunan',               lat: -6.3023, lon: 106.8236, type: 'tj' },
  { id: 'tj-pluit',         name: 'TJ Pluit',                 lat: -6.1150, lon: 106.7954, type: 'tj' },
  { id: 'tj-pulo-gadung',   name: 'TJ Pulo Gadung',           lat: -6.1970, lon: 106.9016, type: 'tj' },
  { id: 'tj-kalideres',     name: 'TJ Kalideres',             lat: -6.1476, lon: 106.7052, type: 'tj' },
  { id: 'tj-pinang-ranti',  name: 'TJ Pinang Ranti',          lat: -6.2828, lon: 106.8809, type: 'tj' },
  { id: 'tj-manggarai',     name: 'TJ Manggarai',             lat: -6.2142, lon: 106.8503, type: 'tj' },
  { id: 'tj-senen',         name: 'TJ Senen',                 lat: -6.1776, lon: 106.8457, type: 'tj' },
  { id: 'tj-priok',         name: 'TJ Tanjung Priok',         lat: -6.1077, lon: 106.8768, type: 'tj' },
  { id: 'tj-bekasi-timur',  name: 'TJ Bekasi Timur',          lat: -6.2378, lon: 107.0183, type: 'tj' },
  { id: 'tj-harapanindah',  name: 'TJ Harapan Indah',         lat: -6.1882, lon: 107.0003, type: 'tj' },
  { id: 'tj-depok',         name: 'TJ Terminal Depok',        lat: -6.3923, lon: 106.8192, type: 'tj' },
  { id: 'tj-lebakbulus',    name: 'TJ Lebak Bulus',           lat: -6.2894, lon: 106.7742, type: 'tj', transfers: ['mrt-lebakbulus'] },
]

export function findNearestStation(
  lat: number,
  lon: number,
  types: TransitType[]
): { station: Station; distKm: number } | null {
  const filtered = STATIONS.filter(s => types.includes(s.type))
  if (filtered.length === 0) return null

  let nearest = filtered[0]
  let minDist = hitungJarak(lat, lon, nearest.lat, nearest.lon)

  for (const st of filtered) {
    const dist = hitungJarak(lat, lon, st.lat, st.lon)
    if (dist < minDist) {
      minDist = dist
      nearest = st
    }
  }

  return { station: nearest, distKm: Number(minDist.toFixed(2)) }
}

/**
 * Cek apakah dua stasiun bisa transfer (terhubung langsung / berdekatan < 500m)
 */
export function canTransfer(stationA: Station, stationB: Station): boolean {
  if (stationA.transfers?.includes(stationB.id)) return true
  if (stationB.transfers?.includes(stationA.id)) return true
  // Cek jarak fisik < 600m (misalnya Sudirman KRL ↔ Dukuh Atas MRT)
  return hitungJarak(stationA.lat, stationA.lon, stationB.lat, stationB.lon) < 0.6
}
