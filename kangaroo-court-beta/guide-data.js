/*
 * guide-data.js — the "how to play" briefing shown when a host opens a game.
 *
 * Rendered by guide.js. Every string is bilingual for the same reason the rest
 * of the UI is: this is host-facing chrome, not game content, so it follows the
 * site language toggle. (game-data.js prompts and the English game titles stay
 * English on purpose — see CLAUDE.md.)
 *
 * Section shapes the renderer understands — a section carries exactly one:
 *   paragraphs: [ {zh, en} ]                       prose
 *   steps:      [ {zh, en} ]                       auto-numbered
 *   roles:      [ {emoji, name:{zh,en}, desc:{zh,en}} ]
 *   tips:       [ {zh, en} ]                       bulleted
 */

const GUIDE_TITLES = {
  what:  { zh: '這是什麼遊戲', en: 'What this game is' },
  how:   { zh: '怎麼玩',       en: 'How to play' },
  roles: { zh: '角色與功能',   en: 'Roles' },
  who:   { zh: '誰做什麼',     en: 'Who does what' },
  tips:  { zh: '主持人小提示', en: 'Host tips' },
};

const GAME_GUIDES = {
  kangaroo: {
    players: { zh: '4–9 人', en: '4–9 players' },
    tagline: {
      zh: '一位玩家因為一條荒謬的罪名受審，檢辯雙方輪流出招，陪審團前後秘密投兩次票。',
      en: 'One player stands trial on a ridiculous charge while the jury votes in secret, twice.',
    },
    sections: [
      { icon: '🎯', title: GUIDE_TITLES.what, paragraphs: [
        { zh: '抽出一條罪名（都是「大家都做過的小事」加上一個好笑的轉折），系統隨機發出被告、檢察官、辯護律師、法官（可關閉），其餘所有人都是陪審團。',
          en: 'Draw a charge (a small everyday habit with a funny twist) and the defendant, prosecutor, defense attorney, and optional judge are dealt at random. Everyone else is the jury.' },
        { zh: '陪審團要投兩次票：聽證前一次、聽證後一次。兩票都是秘密的，到最後 Reveal 才會一起公布，並標出誰被說服而翻了票。',
          en: 'The jury votes twice, before and after the arguments. Both votes stay hidden until the reveal, which shows who was swayed and flipped.' },
        { zh: '這款遊戲不計分，翻票紀錄純粹是話題。',
          en: 'Nothing is scored. The flip list is there purely to talk about.' },
      ]},
      { icon: '🕹️', title: GUIDE_TITLES.how, steps: [
        { zh: '按「⚖️ Draw a Charge」抽罪名並發角色，陪審團先秘密投第一次票（Pre-Vote）。',
          en: 'Tap ⚖️ Draw a Charge to draw the charge and deal the roles, then the jury casts its secret pre-vote.' },
        { zh: '檢察官陳述指控，接著傳喚檢方證人——系統會從陪審團裡隨機挑一位扮演，並發給他一張證人卡。',
          en: 'The prosecutor makes their case, then calls a witness: a juror is picked at random and handed a witness card.' },
        { zh: '辯護律師答辯，接著同樣傳喚一位辯方證人。',
          en: 'The defense answers, then calls a witness of their own.' },
        { zh: '交互詰問：檢辯雙方輪流問被告問題，被告必須回答每一題。',
          en: 'Cross-examination: both sides take turns questioning the defendant, who has to answer everything.' },
        { zh: '陪審團投第二次票（最終票），一樣是秘密的。',
          en: 'The jury casts its final vote, still in secret.' },
        { zh: '按「⚖️ Reveal Verdict!」公布判決與完整投票明細（誰翻了票、往哪邊翻）。',
          en: 'Tap ⚖️ Reveal Verdict! for the verdict and the full breakdown of who flipped, and which way.' },
        { zh: '這局若有法官，最後一步由法官口頭宣讀判決（純儀式，沒有按鈕）。',
          en: 'If this round has a judge, they read the verdict aloud as a final flourish. There is no button for it.' },
      ]},
      { icon: '🎭', title: GUIDE_TITLES.roles, roles: [
        { emoji: '🙇', name: { zh: 'Defendant 被告', en: 'Defendant' },
          desc: { zh: '受審的人。交互詰問階段必須回答雙方的每一個問題。',
                  en: 'The one on trial. Must answer every question during cross-examination.' } },
        { emoji: '⚔️', name: { zh: 'Prosecutor 檢察官', en: 'Prosecutor' },
          desc: { zh: '負責指控，並可以傳喚一位證人來補強論點。',
                  en: 'Makes the accusation and can call one witness to back it up.' } },
        { emoji: '🛡️', name: { zh: 'Defense Attorney 辯護律師', en: 'Defense attorney' },
          desc: { zh: '負責答辯，同樣可以傳喚一位證人。',
                  en: 'Answers the charge and can call a witness too.' } },
        { emoji: '🧑‍⚖️', name: { zh: 'Judge 法官（可關閉）', en: 'Judge (optional)' },
          desc: { zh: '不影響判決結果，最後負責把陪審團的判決正式宣讀出來。4 人局會自動關閉，因為角色不夠分。',
                  en: 'Does not change the verdict, just reads it out at the end. Switched off automatically in a four-player game, where the roles run out.' } },
        { emoji: '👥', name: { zh: 'Jury 陪審團（其餘所有人）', en: 'Jury (everyone else)' },
          desc: { zh: '秘密投兩次票。Guilty 票數大於或等於 Not Guilty 就是有罪——平手不會放過被告，這是 Kangaroo Court。',
                  en: 'Two secret votes each. Guilty wins on a tie: this is a kangaroo court, and the defendant gets no benefit of the doubt.' } },
        { emoji: '🕵️', name: { zh: 'Witness 證人', en: 'Witness' },
          desc: { zh: '從陪審團裡臨時抽出來的人，拿到一張角色卡與一句證詞，要即興演出這個角色回答問題。',
                  en: 'A juror pulled in on the spot, handed a character and a line of evidence, and expected to improvise the rest.' } },
      ]},
      { icon: '💡', title: GUIDE_TITLES.tips, tips: [
        { zh: '最少 4 人。人數不足時按鈕會鎖住，要回首頁把房間人數調高。',
          en: 'Four players minimum. Below that the buttons lock and you have to raise the player count back on the hub.' },
        { zh: '這款遊戲一定要有 Firebase，因為陪審團的票必須保密。',
          en: 'Firebase is required here: the jury votes have to stay secret.' },
        { zh: '全程沒有計時器，每個階段都由主持人按狀態鈕推進；按錯可以用「⬅️ Previous Step」退回。',
          en: 'There is no clock. The host advances each phase with the status button, and ⬅️ Previous Step undoes a misfire.' },
        { zh: '下方的 30 條罪名清單預設收合，分享畫面時不要展開。',
          en: 'The list of all 30 charges stays collapsed. Leave it closed while sharing.' },
      ]},
    ],
  },
};
