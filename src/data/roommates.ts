export interface Roommate {
  id: string
  name: string
  age: number
  occupation: string
  university?: string
  neighborhood: string
  budget: number
  image: string
  bio: string
  interests: string[]
  moveInDate: string
  housingType: string
}

export const roommates: Roommate[] = [
  {
    id: '1',
    name: 'Alana',
    age: 29,
    occupation: 'Student at UVA',
    university: 'University of Amsterdam',
    neighborhood: 'Amsterdam',
    budget: 1000,
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=600&q=80',
    bio: 'UvA Master student looking for a place from April. Love cooking, climbing & weekend trips.',
    interests: ['🧗 Climbing', '🍳 Cooking', '📚 Books', '🌍 Travel'],
    moveInDate: 'April 2026',
    housingType: 'Private room',
  },
  {
    id: '2',
    name: 'Lars',
    age: 26,
    occupation: 'Software Developer',
    neighborhood: 'Amsterdam',
    budget: 1200,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    bio: 'Working at a startup in Amsterdam. Looking for a chill flatmate to share a nice place.',
    interests: ['💻 Tech', '🎸 Music', '🚴 Cycling', '☕ Coffee'],
    moveInDate: 'March 2026',
    housingType: 'Apartment',
  },
  {
    id: '3',
    name: 'Sofia',
    age: 24,
    occupation: 'UX Designer',
    university: 'Hogeschool van Amsterdam',
    neighborhood: 'Amsterdam',
    budget: 950,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    bio: 'Creative designer, love keeping things tidy. Looking for kind, social flatmates.',
    interests: ['🎨 Design', '🌿 Plants', '🍕 Food', '🎬 Films'],
    moveInDate: 'April 2026',
    housingType: 'Private room',
  },
  {
    id: '4',
    name: 'James',
    age: 31,
    occupation: 'Marketing Manager',
    neighborhood: 'Amsterdam',
    budget: 1400,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    bio: 'Expat from London, been in AMS for 2 years. Looking for a modern apartment to share.',
    interests: ['🏃 Running', '🍷 Wine', '🎾 Tennis', '📸 Photography'],
    moveInDate: 'May 2026',
    housingType: 'Apartment',
  },
  {
    id: '5',
    name: 'Nina',
    age: 23,
    occupation: 'PhD Researcher',
    university: 'Vrije Universiteit',
    neighborhood: 'Amsterdam',
    budget: 800,
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
    bio: 'Quiet and tidy researcher. Like to cook and watch documentaries in the evenings.',
    interests: ['🔬 Science', '🌎 Sustainability', '🍵 Tea', '🎵 Jazz'],
    moveInDate: 'March 2026',
    housingType: 'Private room',
  },
]
