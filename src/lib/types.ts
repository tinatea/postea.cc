export type WorkshopEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  price: string;
  capacity: string;
  description: string;
  takeHome: string;
  registrationUrl: string;
  accentColor?: string;
};

export type SiteConfig = {
  name: string;
  wordmark: string;
  nameZh: string;
  tagline: string;
  bio: string;
  instagram: string;
  instagramHandle: string;
  lineUrl: string;
  siteUrl: string;
  about: string;
  eventsSheetUrl: string;
};

export type ProductItem = {
  name: string;
  description: string;
  price: string;
  duration: string | null;
};

export type ProductGroup = {
  heading: string;
  items: ProductItem[];
};

export type Poster = {
  title: string;
  file: string;
  note?: string;
};

export type RecapPhoto = {
  src: string;
  alt: string;
};

export type Recap = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  photos: RecapPhoto[];
  body: string;
};
