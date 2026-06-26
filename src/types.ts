export type LiturgicalGrade = 'sollemnity' | 'feast' | 'memorial' | 'ferial';

export type LiturgicalSeason = 'Masa Biasa' | 'Advent' | 'Natal' | 'Prapaskah' | 'Paskah' | 'Pekan Suci';

export type LiturgicalColor = 'green' | 'purple' | 'white' | 'red' | 'gold' | 'rose';

export interface LiturgicalReadings {
  firstReading: string;
  psalm: string;
  secondReading?: string;
  gospel: string;
  reflection?: string;
}

export interface LiturgicalDay {
  date: Date;
  dateStr: string; // Format: YYYY-MM-DD
  title: string;
  season: LiturgicalSeason;
  grade: LiturgicalGrade;
  gradeLabel: string;
  color: LiturgicalColor;
  colorName: string;
  readings: LiturgicalReadings;
  feastName?: string;
}

export interface Quote {
  quote: string;
  author: string;
  year?: string;
}
