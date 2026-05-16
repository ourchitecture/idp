export type StemixGreetingPartOfDay = 'morning' | 'afternoon' | 'evening';

export type StemixGreeting = {
  message: string;
  partOfDay: StemixGreetingPartOfDay;
  generatedAt: string;
};

export const getStemixPartOfDay = (date: Date): StemixGreetingPartOfDay => {
  const hour = date.getHours();

  if (hour < 12) {
    return 'morning';
  }

  if (hour < 18) {
    return 'afternoon';
  }

  return 'evening';
};

export const createStemixGreeting = (date: Date = new Date()): StemixGreeting => {
  const partOfDay = getStemixPartOfDay(date);

  return {
    message: `Stemix says good ${partOfDay}.`,
    partOfDay,
    generatedAt: date.toISOString(),
  };
};
