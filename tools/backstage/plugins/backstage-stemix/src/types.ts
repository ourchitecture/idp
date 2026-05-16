export type StemixGreetingPartOfDay = 'morning' | 'afternoon' | 'evening';

export type StemixGreetingResponse = {
  message: string;
  partOfDay: StemixGreetingPartOfDay;
  generatedAt: string;
};
