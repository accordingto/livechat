/* Mode 2 · Jump In: 80 easy English topics one Main Speaker can talk about for a few minutes.
 * Kept apart from cut-topics.js, whose prompts open a half-sentence for the next player to take over.
 * Each topic asks for a story, a view or a plan, never a one-word answer.
 * Add prompts here without changing the screens or the game rules.
 */
var CUT_JUMP_TOPICS = (() => {
  'use strict';
  const stories = [
    'Tell us about a trip that did not go as planned. What went wrong, and what did you do?',
    'Tell us about a time you got lost. Where were you, and how did you find your way?',
    'Tell us about an embarrassing moment that you can laugh about now. What happened?',
    'Tell us about the best meal you remember. Where were you, and who was with you?',
    'Tell us about a time you were very late. Why were you late, and what happened next?',
    'Tell us about your first job, or the first time you earned money. What was it like?',
    'Tell us about a time you cooked something and it went wrong. What happened?',
    'Tell us about a teacher you still remember. What did they do or say?',
    'Tell us about something funny that happened at school or at work. Who was there?',
    'Tell us about a time you were scared, but everything ended well. What happened?',
    'Tell us about a gift you will never forget. Who gave it to you, and why was it special?',
    'Tell us about a time you spoke English with a stranger. How did it go?',
    'Tell us about a time you lost something important. Did you get it back?',
    'Tell us about a time you broke something. Who found out, and what did you say?',
    'Tell us about a day when bad weather changed your plans. What did you do in the end?',
    'Tell us about a time a stranger was kind to you. What did they do?',
    'Tell us about a time you laughed at the wrong moment. Why was it so funny?',
    'Tell us about a time you had to wait for a very long time. How did you pass the time?',
    'Tell us about a surprise that you planned, or a surprise that someone planned for you.',
    'Tell us about a small mistake that became a big problem. How did you fix it?',
  ];
  const self = [
    'Describe your perfect day off, from morning to night. Where do you go, and who do you see?',
    'What are you like in the morning? Tell us about the first hour of your day.',
    'What is something you are good at? How did you learn it?',
    'What did you want to be when you were a child? What changed?',
    'Do you plan things early, or do you do them at the last minute? Give us some real examples.',
    'What is one habit you would like to change? Why is it hard to change?',
    'What do you do when you feel stressed? Does it really help?',
    'Tell us about a hobby you started and then stopped. Why did you stop?',
    'What makes you laugh the most? Tell us about the last time you could not stop laughing.',
    'How do your friends describe you? Do you think they are right?',
    'What food could you eat every day? When did you start to love it?',
    'What small thing makes you very happy? Why does it work so well?',
    'What kind of traveler are you? Tell us how you plan, pack, and spend a trip.',
    'What is something new you want to learn? How would you start?',
    'What were you like as a student? What did your teachers think of you?',
  ];
  const opinions = [
    'Is it better to live in a big city or a small town? Use your own experience to explain.',
    'Is it better to travel alone or with other people? Tell us why.',
    'Do phones make our lives better or worse? Give us examples from your own day.',
    'What makes someone a good friend? Tell us about a friend who does this well.',
    'What is the best age to be? Explain what is so good about it.',
    'Should people work only four days a week? What would you do with the extra day?',
    'Is it better to eat at home or at a restaurant? Think about cost, taste, and fun.',
    'What should every child learn at school that schools do not teach now? Why?',
    'Is it OK to tell a small lie to be kind? Give us an example.',
    'What is the best way to learn a language? Tell us what worked for you and what did not.',
    'Are pets part of the family? Tell us what you think, and why.',
    'Is it better to have a lot of free time or a lot of money? Why?',
    'What makes a good boss or a good teacher? Describe the best one you have had.',
    'Should people use their phones during dinner? What are your rules?',
    'Which is better, the morning or the night? Tell us everything you like about it.',
  ];
  const whatif = [
    'What would you do if you won a lot of money tomorrow? Tell us about your first week.',
    'What would happen if you could not use your phone for one month?',
    'If you could live in any country for one year, where would you go? What would your life be like?',
    'If you opened a small shop or restaurant, what would it sell? Describe a normal day there.',
    'What would you do if nobody could see you for one day?',
    'If you could have dinner with any person from any time, who would it be? What would you ask?',
    'What would happen if everyone in the world spoke the same language?',
    'If you were the leader of your city, what three things would you change first?',
    'If you could live one day of your life again, which day would you choose? Why?',
    'What would you do if you woke up and you were ten years old again?',
    'If you had to teach a class tomorrow, what would you teach? Tell us about the first lesson.',
    'What would happen if nobody needed to sleep?',
    'If animals could talk, which animal would you talk to first? What would you ask?',
    'If every day had one more hour, how would you use it?',
    'What would you do if you had to live without money for one week?',
    'If you could become very good at one thing by tomorrow, what would you choose? What would you do next?',
  ];
  const group = [
    'Plan a weekend trip for everyone here. Where do we go, and who does what?',
    'If everyone here opened a restaurant together, what job would each person have?',
    'If this group had to live in one house for a month, what would happen?',
    'Plan a party for this group. What food, what music, and what games?',
    'If this group were alone on an island, who would do which job? How would we get home?',
    'Choose a small gift for each person here. Explain each choice.',
    'If someone made a movie about this group, what kind of movie would it be? Who plays which part?',
    'If everyone here started a company together, what would it sell? Who would be the boss?',
    'Imagine this group ten years from now. What is each person doing?',
    'Tell us about your group of friends. Who is the funny one, who is the quiet one, and who is the leader?',
    'Tell us about a time a group of people worked well together. What made it work?',
    'What is the best way to make a new friend? Tell us how you met one of your friends.',
    'How do you feel when you join a new group of people? What do you usually do first?',
    'Tell us about a tradition in your family or with your friends. How did it start?',
  ];
  const make = (rows, category) => rows.map((question, index) => Object.freeze({
    id: 'jump-' + category + '-' + String(index + 1).padStart(2, '0'), category, question,
  }));
  const items = Object.freeze([...make(stories, 'stories'), ...make(self, 'self'),
    ...make(opinions, 'opinions'), ...make(whatif, 'whatif'), ...make(group, 'group')]);
  return Object.freeze({ items, categories: Object.freeze(['mixed', 'stories', 'self', 'opinions', 'whatif', 'group']) });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_JUMP_TOPICS;
