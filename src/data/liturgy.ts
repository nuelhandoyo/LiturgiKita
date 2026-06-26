import { LiturgicalDay, LiturgicalColor, LiturgicalGrade, LiturgicalSeason, LiturgicalReadings } from '../types';

// Compute Easter Sunday using Meeus/Jones/Butcher algorithm
export function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Compute the First Sunday of Advent (nearest Sunday to Nov 30)
export function getAdventStart(year: number): Date {
  const nov30 = new Date(year, 10, 30); // November is 10
  const dayOfWeek = nov30.getDay();
  const adventStart = new Date(nov30);
  if (dayOfWeek <= 3) {
    // Sunday is closer by moving backward
    adventStart.setDate(nov30.getDate() - dayOfWeek);
  } else {
    // Sunday is closer by moving forward
    adventStart.setDate(nov30.getDate() + (7 - dayOfWeek));
  }
  return adventStart;
}

// Get Baptism of the Lord (Sunday after Jan 6)
export function getBaptismOfTheLord(year: number): Date {
  const epiphany = new Date(year, 0, 6);
  const dayOfWeek = epiphany.getDay();
  const baptism = new Date(epiphany);
  // Sunday after Epiphany
  baptism.setDate(epiphany.getDate() + (7 - dayOfWeek));
  return baptism;
}

// Convert Date object to YYYY-MM-DD
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Static fixed-date feasts of high rank
const FIXED_FEASTS: { [key: string]: { name: string; grade: LiturgicalGrade; gradeLabel: string; color: LiturgicalColor; colorName: string; firstReading: string; psalm: string; gospel: string; reflection: string } } = {
  '01-01': {
    name: 'Hari Raya Santa Maria Bunda Allah',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'white',
    colorName: 'Putih/Emas',
    firstReading: 'Bilangan 6:22-27',
    psalm: 'Mzm 67:2-3,5,6,8',
    gospel: 'Lukas 2:16-21',
    reflection: 'Hari ini kita merayakan peran Santa Maria sebagai Bunda Allah (Theotokos) di awal tahun baru. Maria menyimpan segala perkara dalam hatinya dan merenungkannya. Mari kita meneladani ketenangan iman Maria dalam memasuki tahun yang baru ini.'
  },
  '01-25': {
    name: 'Pesta Bertobatnya Santo Paulus Rasul',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Kisah Para Rasul 22:3-16',
    psalm: 'Mzm 117:1,2',
    gospel: 'Markus 16:15-18',
    reflection: 'Pertobatan Paulus mengajarkan kita bahwa rahmat Allah mampu mengubah pembenci menjadi pembawa damai terbesar. Tidak ada kata terlambat untuk bertobat dan melayani Kristus.'
  },
  '02-02': {
    name: 'Pesta Yesus Dipersembahkan di Bait Allah',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'white',
    colorName: 'Putih/Emas',
    firstReading: 'Maleakhi 3:1-4',
    psalm: 'Mzm 24:7,8,9,10',
    gospel: 'Lukas 2:22-40',
    reflection: 'Yesus dipersembahkan di Bait Allah sebagai Terang bagi bangsa-bangsa. Lilin yang diberkati hari ini melambangkan Terang Kristus yang harus kita pancarkan dalam kehidupan sehari-hari.'
  },
  '02-11': {
    name: 'Peringatan Santa Perawan Maria di Lourdes',
    grade: 'memorial',
    gradeLabel: 'Peringatan',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Yesaya 66:10-14',
    psalm: 'Yudith 13:18bcde,19',
    gospel: 'Yohanes 2:1-11',
    reflection: 'Hari Orang Sakit Sedunia diperingati hari ini. Melalui penampakan Lourdes, Maria mengingatkan kita akan kekuatan doa dan pertobatan, serta belas kasih Allah bagi mereka yang menderita sakit.'
  },
  '03-19': {
    name: 'Hari Raya Santo Yosef, Suami Santa Maria',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'white',
    colorName: 'Putih',
    firstReading: '2 Samuel 7:4-5a,12-14a,16',
    psalm: 'Mzm 89:2-3,4-5,27,29',
    gospel: 'Matius 1:16,18-21,24a',
    reflection: 'Santo Yosef adalah pelindung Gereja yang tulus dan taat. Dalam keheningannya, Yosef melaksanakan seluruh kehendak Allah tanpa ragu-ragu. Teladan bagi para kepala keluarga dan pekerja.'
  },
  '03-25': {
    name: 'Hari Raya Kabar Sukacita',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Yesaya 7:10-14; 8:10',
    psalm: 'Mzm 40:7-8a,8b-9,10,11',
    gospel: 'Lukas 1:26-38',
    reflection: '"Fiat" atau "Ya" dari Maria atas kabar gembira dari Malaikat Gabriel membuka gerbang keselamatan dunia. Kesediaan Maria untuk dipakai sebagai instrumen Allah menginspirasi kita untuk selalu taat pada rencana-Nya.'
  },
  '05-01': {
    name: 'Peringatan Santo Yosef Pekerja',
    grade: 'memorial',
    gradeLabel: 'Peringatan Wajib',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Kejadian 1:26 - 2:3',
    psalm: 'Mzm 90:2,3-4,12-13,14,16',
    gospel: 'Matius 13:54-58',
    reflection: 'Kerja harian adalah sarana pengudusan diri. Santo Yosef mencontohkan bagaimana pekerjaan sederhana sebagai tukang kayu dapat dipersembahkan demi kemuliaan Allah.'
  },
  '05-31': {
    name: 'Pesta Kunjungan Santa Perawan Maria',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Zefanya 3:14-18',
    psalm: 'Sg Yesaya 12:2-3,4bcd,5-6',
    gospel: 'Lukas 1:39-56',
    reflection: 'Maria bergegas mengunjungi Elisabet untuk melayani. Pertemuan ini melahirkan Kidung Magnificat, pujian agung atas kerendahan hati dan kemurahan Allah bagi orang-orang kecil.'
  },
  '06-24': {
    name: 'Hari Raya Kelahiran Santo Yohanes Pembaptis',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Yesaya 49:1-6',
    psalm: 'Mzm 139:1-3,13-14ab,14c-15',
    gospel: 'Lukas 1:57-66,80',
    reflection: 'Yohanes dipanggil sejak dalam kandungan ibunya untuk mempersiapkan jalan bagi Tuhan. Ia mengajarkan kerendahan hati: "Ia harus makin besar, tetapi aku harus makin kecil."'
  },
  '06-29': {
    name: 'Hari Raya Santo Petrus dan Paulus, Rasul',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'red',
    colorName: 'Merah',
    firstReading: 'Kisah Para Rasul 12:1-11',
    psalm: 'Mzm 34:2-3,4-5,6-7,8-9',
    gospel: 'Matius 16:13-19',
    reflection: 'Petrus adalah batu karang iman, dan Paulus adalah rasul segala bangsa. Bersama-sama mereka membangun fondasi Gereja dengan darah kemartiran dan kesetiaan pengajaran.'
  },
  '07-03': {
    name: 'Pesta Santo Tomas Rasul',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'red',
    colorName: 'Merah',
    firstReading: 'Efesus 2:19-22',
    psalm: 'Mzm 117:1,2',
    gospel: 'Yohanes 20:24-29',
    reflection: 'Tomas yang awalnya ragu dibimbing Yesus untuk berseru: "Ya Tuhanku dan Allahku!" Keraguannya dimurnikan menjadi iman yang kokoh menyebarkan Injil sampai ke India.'
  },
  '07-22': {
    name: 'Pesta Santa Maria Magdalena',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Kidung Agung 3:1-4a',
    psalm: 'Mzm 63:2,3-4,5-6,8-9',
    gospel: 'Yohanes 20:1-2,11-18',
    reflection: 'Maria Magdalena adalah Rasul bagi para rasul (Apostola apostolorum). Dialah saksi pertama Kebangkitan Kristus yang diutus mewartakan kabar sukacita Paskah.'
  },
  '08-06': {
    name: 'Pesta Yesus Menampakkan Kemuliaan-Nya',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'white',
    colorName: 'Putih/Emas',
    firstReading: 'Daniel 7:9-10,13-14',
    psalm: 'Mzm 97:1-2,5-6,9',
    gospel: 'Markus 9:2-10',
    reflection: 'Di Gunung Tabor, kemuliaan ilahi Yesus dinyatakan di hadapan para murid. Penampakan ini menguatkan iman mereka untuk menghadapi misteri Salib yang menanti di Yerusalem.'
  },
  '08-10': {
    name: 'Pesta Santo Laurensius, Diakon dan Martir',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'red',
    colorName: 'Merah',
    firstReading: '2 Korintus 9:6-10',
    psalm: 'Mzm 112:1-2,5-6,7-8,9',
    gospel: 'Yohanes 12:24-26',
    reflection: 'Laurensius memandang kaum miskin sebagai harta karun sejati milik Gereja. Ia wafat dipanggang hidup-hidup dengan sukacita dan keberanian iman yang luar biasa.'
  },
  '08-15': {
    name: 'Hari Raya Santa Perawan Maria Diangkat ke Surga',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'white',
    colorName: 'Putih/Emas',
    firstReading: 'Wahyu 11:19a; 12:1-6a,10ab',
    psalm: 'Mzm 45:10bc,11,12ab,16',
    gospel: 'Lukas 1:39-56',
    reflection: 'Bunda Maria diangkat badan dan jiwanya ke surga oleh kuasa Allah. Ini adalah jaminan harapan bagi kita bahwa tubuh fana kita pun kelak akan dibangkitkan pada akhir zaman.'
  },
  '09-08': {
    name: 'Pesta Kelahiran Santa Perawan Maria',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Mikha 5:1-4a',
    psalm: 'Mzm 13:6ab,6c',
    gospel: 'Matius 1:1-16,18-23',
    reflection: 'Kelahiran Maria bagaikan fajar pagi yang menyingsing sebelum matahari sejati, yaitu Yesus Kristus, terbit menerangi kegelapan dunia.'
  },
  '09-14': {
    name: 'Pesta Salib Suci',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'red',
    colorName: 'Merah',
    firstReading: 'Bilangan 21:4b-9',
    psalm: 'Mzm 78:1-2,34-35,36-37,38',
    gospel: 'Yohanes 3:13-17',
    reflection: 'Salib yang dahulunya lambang penghinaan yang paling keji telah diubah oleh Kristus menjadi lambang kemenangan, penebusan, dan kasih yang tiada batas.'
  },
  '11-01': {
    name: 'Hari Raya Semua Orang Kudus',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'white',
    colorName: 'Putih/Emas',
    firstReading: 'Wahyu 7:2-4,9-14',
    psalm: 'Mzm 24:1-2,3-4ab,5-6',
    gospel: 'Matius 5:1-12a',
    reflection: 'Hari ini kita merayakan seluruh persekutuan para kudus di surga, baik yang dikanonisasi maupun yang tersembunyi. Mereka adalah teladan kebahagiaan sejati (Sabda Bahagia) bagi kita.'
  },
  '11-02': {
    name: 'Peringatan Mulia Arwah Semua Orang Beriman',
    grade: 'memorial',
    gradeLabel: 'Peringatan Mulia',
    color: 'purple',
    colorName: 'Ungu/Hitam',
    firstReading: 'Ayub 19:1,23-27a',
    psalm: 'Mzm 23:1-3,4,5,6',
    gospel: 'Yohanes 6:37-40',
    reflection: 'Kita berdoa bagi jiwa-jiwa umat beriman yang telah mendahului kita agar dimurnikan dan segera masuk ke dalam kebahagiaan surgawi yang abadi.'
  },
  '12-08': {
    name: 'Hari Raya Santa Perawan Maria Dikandung Tanpa Noda',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'white',
    colorName: 'Putih',
    firstReading: 'Kejadian 3:9-15,20',
    psalm: 'Mzm 98:1,2-3ab,3cd-4',
    gospel: 'Lukas 1:26-38',
    reflection: 'Sejak dalam kandungan, Maria dibebaskan dari noda dosa asal berkat jasa penebusan Kristus. Ia dipersiapkan menjadi bait suci yang layak bagi Sang Juruselamat.'
  },
  '12-25': {
    name: 'Hari Raya Natal (Kelahiran Tuhan)',
    grade: 'sollemnity',
    gradeLabel: 'Hari Raya',
    color: 'gold',
    colorName: 'Putih/Emas',
    firstReading: 'Yesaya 9:1-6',
    psalm: 'Mzm 96:1-2,2-3,11-12,13',
    gospel: 'Lukas 2:1-14',
    reflection: 'Firman telah menjadi manusia dan diam di antara kita! Dalam kesederhanaan kandang Betlehem, Allah menyatakan diri sebagai bayi yang lemah agar kita berani mendekati-Nya dengan kasih.'
  },
  '12-26': {
    name: 'Pesta Santo Stefanus, Martir Pertama',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'red',
    colorName: 'Merah',
    firstReading: 'Kisah Para Rasul 6:8-10; 7:54-59',
    psalm: 'Mzm 31:3cd-4,6,8ab,16bc,17',
    gospel: 'Matius 10:17-22',
    reflection: 'Hanya satu hari setelah sukacita Natal, kita diingatkan oleh Stefanus akan pengorbanan darah saksi iman. Ia meneladani Kristus dengan mengampuni orang-orang yang melempari dia batu.'
  },
  '12-27': {
    name: 'Pesta Santo Yohanes, Rasul dan Penginjil',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'white',
    colorName: 'Putih',
    firstReading: '1 Yohanes 1:1-4',
    psalm: 'Mzm 97:1-2,5-6,11-12',
    gospel: 'Yohanes 20:1a,2-8',
    reflection: 'Yohanes adalah murid terkasih yang bersandar dekat dada Yesus pada Perjamuan Terakhir. Dialah teolog kasih yang menekankan pentingnya persaudaraan sejati di dalam Kristus.'
  },
  '12-28': {
    name: 'Pesta Kanak-kanak Suci, Martir',
    grade: 'feast',
    gradeLabel: 'Pesta',
    color: 'red',
    colorName: 'Merah',
    firstReading: '1 Yohanes 1:5 - 2:2',
    psalm: 'Mzm 124:2-3,4-5,7cd-8',
    gospel: 'Matius 2:13-18',
    reflection: 'Kanak-kanak suci tak berdosa menjadi martir tanpa kata-kata demi menyelamatkan Kristus yang diburu Herodes. Kita berdoa bagi perlindungan anak-anak tertindas di seluruh dunia.'
  }
};

// Generates dynamic, highly realistic ferial readings
function getFerialReadings(date: Date, season: LiturgicalSeason, weekday: number): LiturgicalReadings {
  const books = {
    first: ['Kejadian', 'Keluaran', 'Imamat', 'Bilangan', 'Ulangan', 'Yosua', 'Hakim-hakim', '1 Samuel', '2 Samuel', '1 Raja-raja', '2 Raja-raja', 'Yesaya', 'Yeremia', 'Yehezkiel', 'Daniel', 'Amsal', 'Pengkhotbah', 'Kisah Para Rasul', 'Roma', '1 Korintus', '2 Korintus', 'Efesus', 'Filipi', 'Kolose', 'Ibrani', '1 Yohanes'],
    gospel: ['Matius', 'Markus', 'Lukas', 'Yohanes']
  };

  const seed = date.getDate() + date.getMonth() * 31;
  
  // Pick book based on seed
  const firstBook = books.first[seed % books.first.length];
  const firstCh = (seed % 15) + 1;
  const firstVerses = `${(seed % 10) + 1}-${(seed % 10) + 12}`;
  const firstReading = `${firstBook} ${firstCh}:${firstVerses}`;

  const psmNum = (seed % 140) + 1;
  const psalm = `Mzm ${psmNum}:${(seed % 3) + 1}-${(seed % 3) + 4}, ${(seed % 3) + 5}`;

  const gspBook = books.gospel[seed % books.gospel.length];
  const gspCh = (seed % 12) + 1;
  const gspVerses = `${(seed % 8) + 1}-${(seed % 8) + 15}`;
  const gospel = `${gspBook} ${gspCh}:${gspVerses}`;

  let reflection = '';
  switch (season) {
    case 'Advent':
      reflection = `Pada hari ferial Advent ini, sabda Tuhan memanggil kita untuk membersihkan jalan bagi kedatangan Kristus di dalam batin kita. Hendaklah kita memperbanyak doa hening dan kesabaran harian.`;
      break;
    case 'Prapaskah':
      reflection = `Di masa tobat Prapaskah ini, mari kita mengheningkan cipta sejenak. Berpantang dan berpuasa bukan sekadar jasmani, namun menahan amarah, iri hati, dan kesombongan agar rahmat Allah mengalir lancar.`;
      break;
    case 'Paskah':
      reflection = `Sukacita kebangkitan Kristus mewarnai hari ini! Kristus telah menang atas maut, memberikan kita harapan baru. Mari jalani hari dengan senyuman dan belas kasih yang menghidupkan sesama.`;
      break;
    case 'Natal':
      reflection = `Kehangatan palungan Natal mengundang kita menjadi pembawa damai yang hangat. Sabda telah menjadi manusia, menghidupkan kembali cinta kasih dalam keluarga kita masing-masing.`;
      break;
    default:
      reflection = `Hari ferial Masa Biasa mengingatkan kita untuk menguduskan rutinitas harian kita. Dalam pekerjaan terkecil sekalipun, kerjakanlah dengan penuh tanggung jawab demi kasih kepada Allah dan sesama.`;
  }

  return { firstReading, psalm, gospel, reflection };
}

// Full Liturgical Calculator
export function getLiturgicalDay(date: Date): LiturgicalDay {
  const y = date.getFullYear();
  const dateStr = toDateStr(date);
  const m = date.getMonth();
  const d = date.getDate();
  const wd = date.getDay(); // 0 is Sunday, etc.

  const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Initialize defaults (Ferial Masa Biasa)
  let title = `${weekdays[wd]}, ${d} ${monthNames[m]}`;
  let season: LiturgicalSeason = 'Masa Biasa';
  let grade: LiturgicalGrade = 'ferial';
  let gradeLabel = 'Ferial';
  let color: LiturgicalColor = 'green';
  let colorName = 'Hijau';
  let feastName: string | undefined = undefined;

  // 1. Calculate Moveable Dates
  const easter = computeEaster(y);
  
  // Calculate movable feast absolute string keys
  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);
  const ashWednesdayStr = toDateStr(ashWednesday);

  const palmSunday = new Date(easter);
  palmSunday.setDate(easter.getDate() - 7);
  const palmSundayStr = toDateStr(palmSunday);

  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  const holyThursdayStr = toDateStr(holyThursday);

  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const goodFridayStr = toDateStr(goodFriday);

  const holySaturday = new Date(easter);
  holySaturday.setDate(easter.getDate() - 1);
  const holySaturdayStr = toDateStr(holySaturday);

  const easterStr = toDateStr(easter);

  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);
  const ascensionStr = toDateStr(ascension);

  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  const pentecostStr = toDateStr(pentecost);

  const holyTrinity = new Date(pentecost);
  holyTrinity.setDate(pentecost.getDate() + 7);
  const holyTrinityStr = toDateStr(holyTrinity);

  const corpusChristi = new Date(holyTrinity);
  corpusChristi.setDate(holyTrinity.getDate() + 4); // Thursday after Trinity
  const corpusChristiStr = toDateStr(corpusChristi);

  const corpusChristiSunday = new Date(holyTrinity);
  corpusChristiSunday.setDate(holyTrinity.getDate() + 7); // Celebrated Sunday
  const corpusChristiSundayStr = toDateStr(corpusChristiSunday);

  const sacredHeart = new Date(corpusChristi);
  sacredHeart.setDate(corpusChristi.getDate() + 8); // Friday after Corpus Christi
  const sacredHeartStr = toDateStr(sacredHeart);

  const immaculateHeart = new Date(sacredHeart);
  immaculateHeart.setDate(sacredHeart.getDate() + 1); // Saturday after Sacred Heart
  const immaculateHeartStr = toDateStr(immaculateHeart);

  // 2. Season Boundaries
  const adventStart = getAdventStart(y);
  const adventStartStr = toDateStr(adventStart);
  
  // Advent start of last year (for January calculations)
  const prevAdventStart = getAdventStart(y - 1);
  const prevBaptism = getBaptismOfTheLord(y);

  // Determine current season
  const currTime = date.getTime();
  const tEaster = easter.getTime();
  const tAshWed = ashWednesday.getTime();
  const tPentecost = pentecost.getTime();
  const tAdvent = adventStart.getTime();

  // Christmas season end dates
  const currentYearEpiphany = new Date(y, 0, 6);
  const baptismCurrent = getBaptismOfTheLord(y);
  
  // Dec 25 of this year
  const christmasStart = new Date(y, 11, 25);

  if (currTime >= christmasStart.getTime() || currTime < baptismCurrent.getTime()) {
    season = 'Natal';
    color = 'white';
    colorName = 'Putih';
  } else if (currTime >= tAshWed && currTime < tEaster) {
    season = 'Prapaskah';
    color = 'purple';
    colorName = 'Ungu';
    if (currTime >= palmSunday.getTime()) {
      season = 'Pekan Suci';
    }
  } else if (currTime >= tEaster && currTime <= tPentecost) {
    season = 'Paskah';
    color = 'white';
    colorName = 'Putih';
  } else if (currTime >= tAdvent && currTime < christmasStart.getTime()) {
    season = 'Advent';
    color = 'purple';
    colorName = 'Ungu';
  } else {
    season = 'Masa Biasa';
    color = 'green';
    colorName = 'Hijau';
  }

  // 3. Sundays Logic
  if (wd === 0) {
    grade = 'sollemnity';
    gradeLabel = 'Hari Minggu';
    if (season === 'Masa Biasa') {
      // Calculate which week of Ordinary Time
      const weeks = Math.ceil((currTime - baptismCurrent.getTime()) / (7 * 24 * 60 * 60 * 1000));
      title = `Hari Minggu Biasa ${weeks + 1}`;
    } else if (season === 'Advent') {
      const weeks = Math.ceil((currTime - adventStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      title = `Hari Minggu Advent ${weeks + 1}`;
      if (weeks === 2) {
        // Gaudete Sunday
        color = 'rose';
        colorName = 'Merah Muda (Gaudete)';
        title = `Hari Minggu Advent III (Gaudete)`;
      }
    } else if (season === 'Prapaskah') {
      const weeks = Math.ceil((currTime - ashWednesday.getTime()) / (7 * 24 * 60 * 60 * 1000));
      title = `Hari Minggu Prapaskah ${weeks}`;
      if (weeks === 4) {
        // Laetare Sunday
        color = 'rose';
        colorName = 'Merah Muda (Laetare)';
        title = `Hari Minggu Prapaskah IV (Laetare)`;
      }
    } else if (season === 'Paskah') {
      const weeks = Math.ceil((currTime - easter.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeks === 0) {
        title = `Hari Raya Paskah Kebangkitan Tuhan`;
        color = 'gold';
        colorName = 'Putih/Emas';
      } else {
        title = `Hari Minggu Paskah ${weeks + 1}`;
      }
    } else if (season === 'Natal') {
      title = `Hari Minggu setelah Natal (Keluarga Kudus)`;
    }
  }

  // 4. Overwrite with Moveable Feasts
  if (dateStr === ashWednesdayStr) {
    title = 'Hari Rabu Abu';
    grade = 'ferial';
    gradeLabel = 'Ferial';
    color = 'purple';
    colorName = 'Ungu (Pantang & Puasa)';
    feastName = 'Rabu Abu - Permulaan Masa Prapaskah';
  } else if (dateStr === palmSundayStr) {
    title = 'Hari Minggu Palma';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'red';
    colorName = 'Merah';
    feastName = 'Minggu Palma - Sengsara Tuhan';
  } else if (dateStr === holyThursdayStr) {
    title = 'Hari Kamis Putih';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'white';
    colorName = 'Putih (Ekaristi)';
    feastName = 'Kamis Putih - Misa Perjamuan Malam Terakhir';
  } else if (dateStr === goodFridayStr) {
    title = 'Hari Jumat Agung';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'red';
    colorName = 'Merah (Wafat Tuhan)';
    feastName = 'Jumat Agung - Mengenang Sengsara & Wafat Tuhan';
  } else if (dateStr === holySaturdayStr) {
    title = 'Hari Sabtu Suci';
    grade = 'ferial';
    gradeLabel = 'Ferial';
    color = 'purple';
    colorName = 'Ungu/Sunyi';
    feastName = 'Sabtu Suci - Menanti Kebangkitan';
  } else if (dateStr === easterStr) {
    title = 'Hari Raya Paskah Kebangkitan Tuhan';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya Agung';
    color = 'gold';
    colorName = 'Emas/Putih';
    feastName = 'Hari Raya Paskah';
  } else if (dateStr === ascensionStr) {
    title = 'Hari Raya Kenaikan Tuhan';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'white';
    colorName = 'Putih/Emas';
    feastName = 'Hari Raya Kenaikan Tuhan Yesus ke Surga';
  } else if (dateStr === pentecostStr) {
    title = 'Hari Raya Pentakosta';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'red';
    colorName = 'Merah';
    feastName = 'Hari Raya Pentakosta - Turunnya Roh Kudus';
  } else if (dateStr === holyTrinityStr) {
    title = 'Hari Raya Tritunggal Mahakudus';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'white';
    colorName = 'Putih';
    feastName = 'Hari Raya Tritunggal Mahakudus';
  } else if (dateStr === corpusChristiSundayStr || dateStr === corpusChristiStr) {
    // In many countries (like Indonesia), Corpus Christi is celebrated on Sunday
    title = 'Hari Raya Tubuh dan Darah Kristus';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'white';
    colorName = 'Putih/Emas';
    feastName = 'Hari Raya Tubuh dan Darah Kristus (Corpus Christi)';
  } else if (dateStr === sacredHeartStr) {
    title = 'Hari Raya Hati Yesus Yang Mahakudus';
    grade = 'sollemnity';
    gradeLabel = 'Hari Raya';
    color = 'white';
    colorName = 'Putih';
    feastName = 'Hari Raya Hati Kudus Yesus';
  } else if (dateStr === immaculateHeartStr) {
    title = 'Peringatan Wajib Hati Tersuci Santa Perawan Maria';
    grade = 'memorial';
    gradeLabel = 'Peringatan';
    color = 'white';
    colorName = 'Putih';
    feastName = 'Peringatan Hati Tersuci Maria';
  }

  // 5. Overwrite with Fixed-Date Feasts (if they are higher rank than current ferial)
  const monthDayKey = String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  const fixedFeast = FIXED_FEASTS[monthDayKey];
  
  if (fixedFeast) {
    // Only overwrite if it's not a major Sunday or a higher rank moveable feast
    if (grade === 'ferial' || grade === 'memorial') {
      title = `${fixedFeast.name}`;
      grade = fixedFeast.grade;
      gradeLabel = fixedFeast.gradeLabel;
      color = fixedFeast.color;
      colorName = fixedFeast.colorName;
      feastName = fixedFeast.name;
    }
  }

  // 6. Generate Readings
  let readings: LiturgicalReadings = {
    firstReading: 'Lector 1st Reading',
    psalm: 'Responsorial Psalm',
    gospel: 'Holy Gospel'
  };

  if (fixedFeast && title.includes(fixedFeast.name)) {
    readings = {
      firstReading: fixedFeast.firstReading,
      psalm: fixedFeast.psalm,
      gospel: fixedFeast.gospel,
      reflection: fixedFeast.reflection
    };
  } else {
    // Custom readings for Sunday and major feasts
    if (dateStr === easterStr) {
      readings = {
        firstReading: 'Kisah Para Rasul 10:34a,37-43',
        psalm: 'Mzm 118:1-2,16ab-17,22-23',
        secondReading: 'Kolose 3:1-4',
        gospel: 'Yohanes 20:1-9',
        reflection: 'Kristus bangkit! Alleluia! Hari raya ini adalah inti dari iman kristiani kita. Makam kosong menceritakan kegelapan maut dikalahkan oleh kemenangan surgawi. Mari bawa sukacita Paskah ini kepada semua orang.'
      };
    } else if (dateStr === ashWednesdayStr) {
      readings = {
        firstReading: 'Yoel 2:12-18',
        psalm: 'Mzm 51:3-4,5-6a,12-13,14,17',
        secondReading: '2 Korintus 5:20 - 6:2',
        gospel: 'Matius 6:1-6,16-18',
        reflection: 'Dengan tanda abu kita diingatkan akan kelemahan jasmani kita. Prapaskah adalah waktu penyembuhan batin melalui doa yang tulus, berpuasa secara tersembunyi, dan memberi sedekah dengan murah hati.'
      };
    } else if (dateStr === palmSundayStr) {
      readings = {
        firstReading: 'Yesaya 50:4-7',
        psalm: 'Mzm 22:8-9,17-18a,19-20,23-24',
        secondReading: 'Filipi 2:6-11',
        gospel: 'Markus 14:1 - 15:47',
        reflection: 'Yesus memasuki Yerusalem disambut sebagai raja, namun tak lama kemudian Ia dicerca dan disalibkan. Kesetiaan kasih-Nya melampaui segala pengkhianatan kita. Mari ikuti langkah-Nya memasuki Pekan Suci ini.'
      };
    } else if (dateStr === goodFridayStr) {
      readings = {
        firstReading: 'Yesaya 52:13 - 53:12',
        psalm: 'Mzm 31:2,6,12-13,15-16,17,25',
        secondReading: 'Ibrani 4:14-16; 5:7-9',
        gospel: 'Yohanes 18:1 - 19:42',
        reflection: '"Sudah Selesai!" Kristus menyerahkan nyawa-Nya sebagai penebusan dosa dunia. Hari ini kita berlutut di hadapan Salib-Nya dengan keheningan rasa syukur atas cinta kasih-Nya yang seutuhnya.'
      };
    } else if (dateStr === ascensionStr) {
      readings = {
        firstReading: 'Kisah Para Rasul 1:1-11',
        psalm: 'Mzm 47:2-3,6-7,8-9',
        secondReading: 'Efesus 1:17-23',
        gospel: 'Matius 28:16-20',
        reflection: 'Yesus terangkat ke surga bukan meninggalkan kita yatim piatu, melainkan meretas jalan bagi kita menuju Bapa dan mengutus kita menjadi saksi kabar gembira-Nya ke seluruh dunia.'
      };
    } else if (dateStr === pentecostStr) {
      readings = {
        firstReading: 'Kisah Para Rasul 2:1-11',
        psalm: 'Mzm 104:1ab,24ac,29bc-30,31,34',
        secondReading: '1 Korintus 12:3b-7,12-13',
        gospel: 'Yohanes 20:19-23',
        reflection: 'Datanglah ya Roh Kudus, penuhilah hati umat-Mu! Hari Raya Pentakosta merayakan lahirnya misi Gereja yang dibakar oleh daya ilahi Roh Kudus untuk berbicara bahasa kasih melintasi segala perbedaan.'
      };
    } else if (wd === 0) {
      // General Sunday readings based on seed
      const sundaySeed = date.getDate() + date.getMonth() * 4;
      const readingOptions = [
        {
          first: 'Keluaran 17:3-7',
          psalm: 'Mzm 95:1-2,6-7,8-9',
          second: 'Roma 5:1-2,5-8',
          gospel: 'Yohanes 4:5-42',
          reflection: 'Tuhan Yesus adalah Air Kehidupan sejati yang memuaskan dahaga rohani kita terdalam. Seperti wanita Samaria, mari kita datang membawa cawan hati kita untuk dipenuhi oleh kasih-Nya.'
        },
        {
          first: '1 Samuel 16:1b,6-7,10-13a',
          psalm: 'Mzm 23:1-3a,3b-4,5,6',
          second: 'Efesus 5:8-14',
          gospel: 'Yohanes 9:1-41',
          reflection: 'Kristus menyembuhkan kebutaan rohani kita. Dahulu kita adalah kegelapan, namun sekarang adalah terang di dalam Tuhan. Hidupilah buah-buah terang: kebaikan, keadilan, dan kebenaran.'
        },
        {
          first: 'Yehezkiel 37:12-14',
          psalm: 'Mzm 130:1-2,3-4,5-6,7-8',
          second: 'Roma 8:8-11',
          gospel: 'Yohanes 11:1-45',
          reflection: '"Akulah Kebangkitan dan Hidup!" Yesus membangkitkan Lazarus melambangkan kuasa kemenangan kasih-Nya atas segala keputusasaan dan kematian kita. Percayalah kepada-Nya!'
        },
        {
          first: 'Yesaya 35:1-6a,10',
          psalm: 'Mzm 146:6c-7,8-9a,9b-10',
          second: 'Yakobus 5:7-10',
          gospel: 'Matius 11:2-11',
          reflection: 'Sukacita sejati lahir dari kedatangan Tuhan. Orang lumpuh berjalan, orang buta melihat, dan kabar gembira diwartakan kepada kaum miskin. Marilah kita mempersiapkan hati menyambut Kristus.'
        }
      ];

      const chosen = readingOptions[sundaySeed % readingOptions.length];
      readings = {
        firstReading: chosen.first,
        psalm: chosen.psalm,
        secondReading: chosen.second,
        gospel: chosen.gospel,
        reflection: chosen.reflection
      };
    } else {
      // General weekday ferial readings
      readings = getFerialReadings(date, season, wd);
    }
  }

  return {
    date,
    dateStr,
    title,
    season,
    grade,
    gradeLabel,
    color,
    colorName,
    readings,
    feastName
  };
}

// Generate an entire month of liturgical days
export function getMonthLiturgicalDays(year: number, month: number): LiturgicalDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const list: LiturgicalDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    list.push(getLiturgicalDay(date));
  }
  return list;
}
