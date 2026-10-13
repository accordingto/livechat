"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PROMPT = exports.QUESTION_SCHEMA = exports.RELATED_INTENT_GROUPS = exports.SEED_QUESTIONS = void 0;
exports.areSimilar = areSimilar;
exports.emptyHistory = emptyHistory;
exports.normalizeHistory = normalizeHistory;
exports.markSelected = markSelected;
exports.markReplaced = markReplaced;
exports.validateBatch = validateBatch;
exports.createSeededRandom = createSeededRandom;
exports.selectQuestions = selectQuestions;
exports.sanitizeTopicHint = sanitizeTopicHint;
exports.requestCandidates = requestCandidates;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
// Server-only: the supplied bank JSON is the single source of question content.
function referenceFile(name) {
    const path = (0, node_path_1.join)(__dirname, 'assets', 'life-story', name);
    if (!(0, node_fs_1.existsSync)(path))
        throw new Error('Missing question asset: ' + name);
    return (0, node_fs_1.readFileSync)(path, 'utf8');
}
const bank = JSON.parse(referenceFile('life_story_questions.zh-TW.en.json'));
const schema = JSON.parse(referenceFile('question_batch.schema.json'));
/** Implements the exact schema keywords used by the supplied schema. This is
 * a scoped validator, not a general JSON Schema implementation. Enums, bounds,
 * locale fields and shape constraints are read from that authoritative file. */
function matchesSchema(value, rule, root = schema) {
    if (rule.$ref) {
        if (!rule.$ref.startsWith('#/'))
            throw new Error('Unsupported schema reference');
        const target = rule.$ref.slice(2).split('/').reduce((node, key) => node[key.replace(/~1/g, '/').replace(/~0/g, '~')], root);
        if (!matchesSchema(value, target, root))
            return false;
    }
    if (rule.const !== undefined && value !== rule.const)
        return false;
    if (rule.enum && !rule.enum.includes(value))
        return false;
    if (rule.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            return false;
        if ((rule.required || []).some(key => !Object.hasOwn(value, key)))
            return false;
        if (rule.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(rule.properties || {}, key)))
            return false;
        for (const [key, child] of Object.entries(rule.properties || {})) {
            if (Object.hasOwn(value, key) && !matchesSchema(value[key], child, root))
                return false;
        }
    }
    else if (rule.type === 'array') {
        if (!Array.isArray(value))
            return false;
        if (rule.minItems !== undefined && value.length < rule.minItems || rule.maxItems !== undefined && value.length > rule.maxItems)
            return false;
        if (rule.items && !value.every(item => matchesSchema(item, rule.items, root)))
            return false;
    }
    else if (rule.type === 'string') {
        if (typeof value !== 'string')
            return false;
        const length = [...value].length;
        if (rule.minLength !== undefined && length < rule.minLength || rule.maxLength !== undefined && length > rule.maxLength)
            return false;
        if (rule.pattern && !new RegExp(rule.pattern, 'u').test(value))
            return false;
    }
    else if (rule.type !== undefined) {
        throw new Error('Unsupported schema type: ' + rule.type);
    }
    return true;
}
const validateQuestion = value => matchesSchema(value, schema.$defs.Question);
const envelopeSchema = { ...schema, properties: { ...schema.properties,
        questions: { ...schema.properties.questions, items: {} } } };
const validateEnvelope = value => matchesSchema(value, envelopeSchema);
exports.SEED_QUESTIONS = bank.questions;
exports.RELATED_INTENT_GROUPS = bank.relatedIntentGroups;
exports.QUESTION_SCHEMA = schema;
exports.SYSTEM_PROMPT = referenceFile('QUESTION_GENERATOR_PROMPT.md')
    .split('## 一、可直接作為 system／developer prompt 的內容')[1]
    .split('## 二、呼叫端提供的最小資料')[0].trim();
const catalog = new Map(exports.SEED_QUESTIONS.map((q) => [q.id, q]));
const groups = new Map();
for (const group of exports.RELATED_INTENT_GROUPS) {
    for (const key of group.intentKeys)
        groups.set(key, group.id);
}
/** Hard checks only. Meaning, translation quality and ordinary-life accessibility
 * remain editorial review duties; these rules do not claim semantic perfection. */
const unsafePhrases = [
    /秘密|不敢告訴|從[未沒]告訴|創傷|家暴|霸凌|性經驗|性行為|最痛苦|最大遺憾|失戀|精神診斷/u,
    /(?:在場|房間[裡內中]).*(?:最討厭|最不喜歡|羞辱)|(?:指認|指出).*(?:討厭|脆弱)/u,
    /(?:政治|宗教)(?:立場|信仰)|(?:薪水|收入|存款|負債|身分證|身份證).*(?:多少|數字|號碼)/u,
    /\b(?:secret|trauma|traumatic|sexual experience|sex life|domestic violence|abuse|bullying|diagnosis|most painful|biggest regret|heartbreak)\b/i,
    /\b(?:political|religious) (?:belief|stance|affiliation)|\b(?:salary|income|debt|bank balance|identity number)\b/i,
    /(?:hate|dislike|humiliate).*(?:room|present)|(?:room|present).*(?:hate|dislike|humiliate)/i,
];
function hardErrors(question) {
    const errors = [];
    const strings = [...Object.values(question.question), ...Object.values(question.optionalPrompts).flat()];
    if (strings.some((value) => !value.replace(/[\s\p{Z}\p{Cc}\p{Cf}]/gu, '')))
        errors.push('empty_text');
    if (question.question.en.trim().split(/\s+/u).length > 40)
        errors.push('english_word_limit');
    if (Object.values(question.question).some((value) => (value.match(/[?？]/gu) ?? []).length > 1))
        errors.push('multiple_main_questions');
    if (strings.some((value) => unsafePhrases.some((pattern) => pattern.test(value))))
        errors.push('unsafe_phrase');
    if (strings.some((value) => /成功的定義|人生的意義|價值觀是什麼|define success|meaning of life/iu.test(value)))
        errors.push('abstract_entry');
    if (strings.some((value) => /讓你成為更好的人|how.*failure.*(?:made|make).*better person/iu.test(value)))
        errors.push('forced_growth_conclusion');
    return errors;
}
for (const q of exports.SEED_QUESTIONS) {
    if (!validateQuestion(q) || hardErrors(q).length)
        throw new Error(`Invalid supplied question ${q.id}`);
}
if (exports.SEED_QUESTIONS.length !== 96 || bank.totalQuestions !== 96 ||
    new Set(exports.SEED_QUESTIONS.map((q) => q.id)).size !== 96 ||
    new Set(exports.SEED_QUESTIONS.map((q) => q.intentKey)).size !== 96) {
    throw new Error('The complete 96-question seed bank is required');
}
function normalized(text) {
    return text.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu, '');
}
function fragments(text, locale) {
    if (locale === 'en') {
        const words = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/gu) ?? [];
        const stopwords = new Set(['tell', 'us', 'about', 'share', 'think', 'of', 'a', 'an', 'the', 'you', 'your', 'when', 'that', 'have', 'ever', 'time', 'moment']);
        const meaningful = words.filter((word) => !stopwords.has(word));
        return new Set(meaningful.map((word, i) => `${word} ${meaningful[i + 1] ?? ''}`));
    }
    const clean = normalized(text).replace(/有沒有|回想|分享|一次|一個|聊聊|最近|當時/gu, '');
    return new Set([...clean].slice(0, -1).map((char, i) => `${char}${[...clean][i + 1]}`));
}
function dice(a, b) {
    if (!a.size || !b.size)
        return 0;
    let overlap = 0;
    for (const value of a)
        if (b.has(value))
            overlap++;
    return 2 * overlap / (a.size + b.size);
}
// A deliberately small, testable equivalence rule catches a known adversarial
// example even when a model invents a different intentKey. Related intent groups
// are a separate within-selection diversity rule, not a room-wide ban.
function semanticFamily(q) {
    const text = `${q.question['zh-TW']} ${q.question.en}`;
    if (/(?:第一次|初次).*(?:旅行|出遠門|遠行)|first.*(?:trip|travel|journey)/iu.test(text))
        return 'first_trip';
    return null;
}
function areSimilar(a, b) {
    if (a.intentKey === b.intentKey)
        return true;
    const family = semanticFamily(a);
    if (family && family === semanticFamily(b))
        return true;
    for (const locale of ['zh-TW', 'en']) {
        if (normalized(a.question[locale]) === normalized(b.question[locale]))
            return true;
        if (dice(fragments(a.question[locale], locale), fragments(b.question[locale], locale)) >= 0.84)
            return true;
    }
    return false;
}
function emptyHistory() {
    return { selections: 0, displayed: [], selected: [], replaced: [] };
}
/** Firebase omits empty containers and can restore arrays as numeric-key maps.
 * Preserve this room's metadata and ordering; never interpret absence as a reset. */
function normalizeHistory(history) {
    if (!history || typeof history !== 'object' || Array.isArray(history)) history = {};
    const list = value => Array.isArray(value) ? value.filter(item => item != null) :
        value && typeof value === 'object' ? Object.keys(value).sort((a, b) =>
            /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : a.localeCompare(b))
            .map(key => value[key]).filter(item => item != null) : [];
    const validMetadata = item => item && typeof item.id === 'string' && typeof item.intentKey === 'string';
    history.displayed = list(history.displayed).filter(validMetadata).map(item => ({
        id: item.id, intentKey: item.intentKey,
        selection: Number.isSafeInteger(Number(item.selection)) && Number(item.selection) >= 0 ? Number(item.selection) : 0,
    }));
    history.selected = list(history.selected).filter(validMetadata).map(item => ({ id: item.id, intentKey: item.intentKey }));
    history.replaced = [...new Set(list(history.replaced).filter(item => typeof item === 'string'))];
    const selections = Number.isSafeInteger(Number(history.selections)) && Number(history.selections) >= 0 ? Number(history.selections) : 0;
    history.selections = history.displayed.reduce((latest, item) => Math.max(latest, item.selection), selections);
    return history;
}
function markSelected(history, question) {
    history = normalizeHistory(history);
    if (!history.selected.some((q) => q.id === question.id && q.intentKey === question.intentKey)) {
        history.selected.push({ id: question.id, intentKey: question.intentKey });
    }
}
function markReplaced(history, questions) {
    history = normalizeHistory(history);
    for (const question of questions)
        if (!history.replaced.includes(question.id))
            history.replaced.push(question.id);
}
function validateBatch(raw, history = emptyHistory()) {
    history = normalizeHistory(history);
    let batch = raw;
    if (typeof raw === 'string') {
        if (raw.length > 128_000)
            return { accepted: [], diagnostics: ['response_too_large'] };
        try {
            batch = JSON.parse(raw);
        }
        catch {
            return { accepted: [], diagnostics: ['invalid_json'] };
        }
    }
    if (!validateEnvelope(batch))
        return { accepted: [], diagnostics: ['invalid_batch_schema'] };
    const accepted = [];
    const diagnostics = [];
    const ids = new Set();
    const intentKeys = new Set();
    const used = new Set(history.selected.map((q) => q.intentKey));
    const recent = history.displayed.filter((q) => history.selections - q.selection < 6);
    const pastQuestions = [...history.selected, ...recent].flatMap((q) => catalog.get(q.id) ?? []);
    for (const [index, value] of (batch.questions).entries()) {
        if (!validateQuestion(value)) {
            diagnostics.push(`question_${index}:invalid_question_schema`);
            continue;
        }
        const question = value;
        const errors = hardErrors(question);
        if (ids.has(question.id))
            errors.push('duplicate_id');
        if (intentKeys.has(question.intentKey))
            errors.push('duplicate_intent');
        ids.add(question.id);
        intentKeys.add(question.intentKey);
        if (used.has(question.intentKey) || recent.some((q) => q.intentKey === question.intentKey))
            errors.push('historical_intent');
        if ([...accepted, ...pastQuestions].some((q) => areSimilar(question, q)))
            errors.push('similar_question');
        if (errors.length) {
            diagnostics.push(`question_${index}:${errors.join(',')}`);
            continue;
        }
        // IDs are stable content hashes assigned by this trusted server. Model IDs
        // never overwrite a seed or previous generated question in the catalog.
        const id = `AI_${(0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ ...question, id: undefined })).digest('hex').slice(0, 24)}`;
        const candidate = { ...structuredClone(question), id };
        accepted.push(candidate);
        catalog.set(id, candidate);
    }
    const light = accepted.filter((q) => q.intimacy === 'light').length;
    if (accepted.length !== 6 || light !== 4)
        diagnostics.push('editorial_batch_mix:expected_4_light_2_personal');
    if (new Set(accepted.map((q) => q.theme)).size < 4)
        diagnostics.push('editorial_batch_diversity:fewer_than_4_themes');
    if (new Set(accepted.map((q) => q.storyShape)).size < 3)
        diagnostics.push('editorial_batch_diversity:fewer_than_3_shapes');
    return { accepted, diagnostics };
}
function chooseTriple(pool, used, preferredIds, random) {
    let winner = [];
    let best = -Infinity;
    let ties = 0;
    for (let i = 0; i < pool.length; i++)
        for (let j = i + 1; j < pool.length; j++)
            for (let k = j + 1; k < pool.length; k++) {
                const candidates = [pool[i], pool[j], pool[k]];
                const groupKeys = candidates.map((q) => groups.get(q.intentKey) ?? q.intentKey);
                const light = candidates.filter((q) => q.intimacy === 'light').length;
                let score = candidates.filter((q) => !used.has(q.intentKey)).length * 10_000_000;
                score += (light === 2 ? 1_000_000 : light === 1 ? 100_000 : 0);
                score += new Set(groupKeys).size * 10_000;
                score += new Set(candidates.map((q) => q.theme)).size * 1_000;
                score += new Set(candidates.map((q) => q.storyShape)).size * 100;
                score += new Set(candidates.map((q) => q.tone)).size * 10;
                score += candidates.filter((q) => preferredIds.has(q.id)).length;
                if (score > best) {
                    best = score;
                    winner = candidates;
                    ties = 1;
                }
                else if (score === best && random() < 1 / ++ties)
                    winner = candidates;
            }
    return winner;
}
function selectFromPool(history, cooldown, pool, preferredIds = new Set(), random) {
    history = normalizeHistory(history);
    if (typeof random !== 'function') random = createSeededRandom(history.selections);
    const used = new Set(history.selected.map((q) => q.intentKey));
    const selectedQuestions = history.selected.flatMap((q) => catalog.get(q.id) ?? []);
    const unused = pool.filter((q) => !used.has(q.intentKey) && !selectedQuestions.some((past) => areSimilar(q, past)));
    const lastDisplayed = new Map(history.displayed.map((q) => [q.id, q.selection]));
    const initialCooldown = Number.isFinite(cooldown) ? Math.max(0, Math.floor(cooldown)) : 6;
    let eligible = [];
    // Relax only unselected display cooldowns first. Exhaustion can degrade the
    // depth mix; it must not quietly repeat an already-used intent to meet a quota.
    for (let effective = initialCooldown; effective >= 0; effective--) {
        eligible = unused.filter((q) => history.selections - (lastDisplayed.get(q.id) ?? -Infinity) >= effective);
        if (eligible.length >= 3)
            break;
    }
    let reused = false;
    if (eligible.length < 3) {
        eligible = [...unused, ...pool.filter((q) => !unused.includes(q))];
        reused = true;
    }
    const questions = chooseTriple(eligible, used, preferredIds, random);
    if (questions.length !== 3)
        throw new Error('The question pool must contain at least three questions');
    reused ||= questions.some((q) => used.has(q.intentKey) || selectedQuestions.some((past) => areSimilar(q, past)));
    history.selections++;
    for (const q of questions)
        history.displayed.push({ id: q.id, intentKey: q.intentKey, selection: history.selections });
    return { questions: structuredClone(questions), reused };
}
/** Captured command seeds keep Firebase transaction retries deterministic. */
function createSeededRandom(seed) {
    let value = (0, node_crypto_1.createHash)('sha256').update(String(seed)).digest().readUInt32LE(0) || 1;
    return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}
function selectQuestions(history, cooldown = 6, seedOrRandom) {
    history = normalizeHistory(history);
    const random = typeof seedOrRandom === 'function' ? seedOrRandom : createSeededRandom(seedOrRandom ?? history.selections);
    return selectFromPool(history, cooldown, exports.SEED_QUESTIONS, new Set(), random);
}
const topicAliases = {
    everyday: 'everyday', 日常: 'everyday', 'everyday moments': 'everyday',
    growing_up: 'growing_up', 成長: 'growing_up', new_experiences: 'new_experiences', 初次嘗試: 'new_experiences',
    mishaps: 'mishaps', 小失誤: 'mishaps', connection: 'connection', 相處: 'connection',
    social_self: 'social_self', choices: 'choices', 選擇: 'choices',
    objects_places: 'objects_places', 物品與地方: 'objects_places', interests: 'interests', 興趣: 'interests',
    expectation: 'expectation', 期待: 'expectation', effort: 'effort', 練習: 'effort',
    perspective: 'perspective', 看法: 'perspective',
};
/** Explicit whitelist. Arbitrary hint prose is never interpreted as instructions. */
function sanitizeTopicHint(hint) {
    if (typeof hint !== 'string')
        return null;
    const key = hint.trim().toLowerCase();
    return Object.hasOwn(topicAliases, key) ? topicAliases[key] : null;
}
/** Optional provider seam; no provider credentials or network are needed to play.
 * It receives question metadata only, never a room, player, story or card object. */
async function requestCandidates(provider, history, topicHint = null, timeoutMs = 3_000) {
    history = normalizeHistory(history);
    const fallback = (diagnostics) => ({ ...selectQuestions(history), source: 'local', diagnostics });
    if (!provider)
        return fallback(['provider_unavailable']);
    const controller = new AbortController();
    let timer;
    const recent = history.displayed.slice(-18);
    const recentQuestions = recent.flatMap((q) => catalog.get(q.id) ?? []);
    const input = {
        task: 'generate_question_candidates', candidateCount: 6, roomTopicHint: sanitizeTopicHint(topicHint),
        recentDisplayed: recent.map((q) => ({ id: q.id, intentKey: q.intentKey,
            ...(catalog.get(q.id) ? { question: catalog.get(q.id).question['zh-TW'] } : {}) })),
        usedIntentKeys: [...new Set(history.selected.map((q) => q.intentKey))],
        recentThemes: [...new Set(recentQuestions.map((q) => q.theme))],
        recentShapes: [...new Set(recentQuestions.map((q) => q.storyShape))], requirements: { light: 4, personal: 2 },
    };
    try {
        const raw = await Promise.race([
            Promise.resolve().then(() => provider({ systemPrompt: exports.SYSTEM_PROMPT, input, schema: exports.QUESTION_SCHEMA, signal: controller.signal })),
            new Promise((_, reject) => {
                timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, Math.max(1, Math.min(30_000, Number.isFinite(timeoutMs) ? timeoutMs : 3_000)));
            }),
        ]);
        const { accepted, diagnostics } = validateBatch(raw, history);
        if (!accepted.length)
            return fallback(diagnostics);
        const preferred = new Set(accepted.map((q) => q.id));
        const selection = selectFromPool(history, 6, [...accepted, ...exports.SEED_QUESTIONS], preferred);
        const aiCount = selection.questions.filter((q) => preferred.has(q.id)).length;
        return { ...selection, source: aiCount === 3 ? 'provider' : aiCount ? 'mixed' : 'local', diagnostics };
    }
    catch {
        // Technical status only; never log response text or player information.
        return fallback([controller.signal.aborted ? 'provider_timeout' : 'provider_failure']);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
