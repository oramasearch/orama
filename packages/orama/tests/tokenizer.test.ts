import t from 'tap'

import { stemmer as bulgarianStemmer, language as bulgarianLanguage } from '@orama/stemmers/bulgarian'
import { stemmer as danishStemmer, language as danishLanguage } from '@orama/stemmers/danish'
import { stemmer as dutchStemmer, language as dutchLanguage } from '@orama/stemmers/dutch'
import { stemmer as finnishStemmer, language as finnishLanguage } from '@orama/stemmers/finnish'
import { stemmer as frenchStemmer, language as frenchLanguage } from '@orama/stemmers/french'
import { stemmer as germanStemmer, language as germanLanguage } from '@orama/stemmers/german'
import { stemmer as italianStemmer, language as italianLanguage } from '@orama/stemmers/italian'
import { stemmer as norwegianStemmer, language as norwegianLanguage } from '@orama/stemmers/norwegian'
import { stemmer as portugueseStemmer, language as portugueseLanguage } from '@orama/stemmers/portuguese'
import { stemmer as russianStemmer, language as russianLanguage } from '@orama/stemmers/russian'
import { stemmer as spanishStemmer, language as spanishLanguage } from '@orama/stemmers/spanish'
import { stemmer as swedishStemmer, language as swedishLanguage } from '@orama/stemmers/swedish'
import { stemmer as ukrainianStemmer, language as ukrainianLanguage } from '@orama/stemmers/ukrainian'
import { stemmer as tamilStemmer, language as tamilLanguage } from '@orama/stemmers/tamil'

import { stopwords as danishStopwords } from '@orama/stopwords/danish'
import { stopwords as dutchStopwords } from '@orama/stopwords/dutch'
import { stopwords as englishStopwords } from '@orama/stopwords/english'
import { stopwords as finnishStopwords } from '@orama/stopwords/finnish'
import { stopwords as frenchStopwords } from '@orama/stopwords/french'
import { stopwords as germanStopwords } from '@orama/stopwords/german'
import { stopwords as italianStopwords } from '@orama/stopwords/italian'
import { stopwords as norwegianStopwords } from '@orama/stopwords/norwegian'
import { stopwords as portugueseStopwords } from '@orama/stopwords/portuguese'
import { stopwords as russianStopwords } from '@orama/stopwords/russian'
import { stopwords as spanishStopwords } from '@orama/stopwords/spanish'
import { stopwords as swedishStopwords } from '@orama/stopwords/swedish'
import { stopwords as ukrainianStopwords } from '@orama/stopwords/ukrainian'
import { stopwords as tamilStopwords } from '@orama/stopwords/tamil'

import { createTokenizer } from '../src/components/tokenizer/index.js'

t.test('Tokenizer', async (t) => {
  t.test('should tokenize and stem correctly in english', async (t) => {
    const tokenizer = await createTokenizer({ language: 'english', stopWords: false, stemming: true })

    const I1 = 'the quick brown fox jumps over the lazy dog'
    const I2 = 'I baked some cakes'

    const O1 = tokenizer.tokenize(I1, 'english')
    const O2 = tokenizer.tokenize(I2, 'english')

    t.strictSame(O1, ['the', 'quick', 'brown', 'fox', 'jump', 'over', 'lazi', 'dog'])
    t.strictSame(O2, ['i', 'bake', 'some', 'cake'])
  })

  t.test('should tokenize and stem correctly in english and allow duplicates', async (t) => {
    const tokenizer = await createTokenizer({
      language: 'english',
      allowDuplicates: true,
      stopWords: false,
      stemming: true
    })

    const I1 = 'this is a test with test duplicates'
    const I2 = "it's alive! it's alive!"

    const O1 = tokenizer.tokenize(I1, 'english')
    const O2 = tokenizer.tokenize(I2, 'english')

    t.strictSame(O1, ['thi', 'is', 'a', 'test', 'with', 'test', 'duplic'])
    t.strictSame(O2, ["it'", 'aliv', "it'", 'aliv'])
  })

  t.test('should tokenize and stem correctly in english skipping appropriate properties (single)', async (t) => {
    const tokenizer = await createTokenizer({
      language: 'english',
      stemming: true,
      stemmerSkipProperties: 'notToStem',
      stopWords: englishStopwords
    })

    const I1 = 'the quick brown fox jumps over the lazy dog'

    const O1 = tokenizer.tokenize(I1, 'english')
    const O2 = tokenizer.tokenize(I1, 'english', 'notToStem')

    t.strictSame(O1, ['quick', 'brown', 'fox', 'jump', 'lazi', 'dog'])
    t.strictSame(O2, ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'])
  })

  t.test('should tokenize and stem correctly in english skipping appropriate properties (multiple)', async (t) => {
    const tokenizer = await createTokenizer({
      language: 'english',
      stemming: true,
      stemmerSkipProperties: ['notToStem', 'another'],
      stopWords: englishStopwords
    })

    const I1 = 'the quick brown fox jumps over the lazy dog'

    const O1 = tokenizer.tokenize(I1, 'english')
    const O2 = tokenizer.tokenize(I1, 'english', 'notToStem')
    const O3 = tokenizer.tokenize(I1, 'english', 'another')

    t.strictSame(O1, ['quick', 'brown', 'fox', 'jump', 'lazi', 'dog'])
    t.strictSame(O2, ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'])
    t.strictSame(O3, ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'])
  })

  t.test('should tokenize and stem correctly in english skipping appropriate properties (invalid)', async (t) => {
    const tokenizer = await createTokenizer({
      language: 'english',
      stemming: true,
      // @ts-expect-error Testing error
      stemmerSkipProperties: 1,
      stopWords: englishStopwords
    })

    const I1 = 'the quick brown fox jumps over the lazy dog'

    const O1 = tokenizer.tokenize(I1, 'english')
    const O2 = tokenizer.tokenize(I1, 'english', 'notToStem')

    t.strictSame(O1, ['quick', 'brown', 'fox', 'jump', 'lazi', 'dog'])
    t.strictSame(O2, ['quick', 'brown', 'fox', 'jump', 'lazi', 'dog'])
  })

  t.test('should tokenize and stem correctly in french', async (t) => {
    const tokenizer = await createTokenizer({
      language: frenchLanguage,
      stemmer: frenchStemmer,
      stopWords: frenchStopwords
    })

    const I1 = 'voyons quel temps il fait dehors'
    const I2 = "j'ai fait des gâteaux"

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['voyon', 'temp', 'fait', 'dehor'])
    t.strictSame(O2, ['fait', 'gateau'])
  })

  t.test('should tokenize and stem correctly in italian', async (t) => {
    const tokenizer = await createTokenizer({
      language: italianLanguage,
      stemmer: italianStemmer,
      stopWords: italianStopwords
    })

    const I1 = 'ho cucinato delle torte'
    const I2 = 'dormire è una cosa difficile quando i test non passano'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['cucin', 'tort'])
    t.strictSame(O2, ['dorm', 'cos', 'difficil', 'quand', 'test', 'pass'])
  })

  t.test('should tokenize and stem correctly in norwegian', async (t) => {
    const tokenizer = await createTokenizer({
      language: norwegianLanguage,
      stemmer: norwegianStemmer,
      stopWords: norwegianStopwords
    })
    const I1 = 'Jeg kokte noen kaker'
    const I2 = 'å sove er en vanskelig ting når testene mislykkes'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['kokt', 'kak'])
    t.strictSame(O2, ['sov', 'vansk', 'ting', 'test', 'mislykk'])
  })

  t.test('should tokenize and stem correctly in portuguese', async (t) => {
    const tokenizer = await createTokenizer({
      language: portugueseLanguage,
      stemmer: portugueseStemmer,
      stopWords: portugueseStopwords
    })

    const I1 = 'Eu cozinhei alguns bolos'
    const I2 = 'dormir é uma coisa difícil quando os testes falham'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['cozinh', 'alguns', 'bol'])
    t.strictSame(O2, ['dorm', 'e', 'cois', 'dificil', 'test', 'falh'])
  })

  t.test('should tokenize and stem correctly in russian', async (t) => {
    const tokenizer = await createTokenizer({
      language: russianLanguage,
      stemmer: russianStemmer,
      stopWords: russianStopwords
    })

    const I1 = 'я приготовила пирожные'
    const I2 = 'спать трудно, когда тесты не срабатывают'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['приготов', 'пирожн'])
    t.strictSame(O2, ['спат', 'трудн', 'тест', 'срабатыва'])
  })

  t.test('should tokenize and stem correctly in swedish', async (t) => {
    const tokenizer = await createTokenizer({
      language: swedishLanguage,
      stemmer: swedishStemmer,
      stopWords: swedishStopwords
    })
    const I1 = 'Jag lagade några kakor'
    const I2 = 'att sova är en svår sak när testerna misslyckas'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['lag', 'kak'])
    t.strictSame(O2, ['sov', 'svar', 'sak', 'test', 'misslyck'])
  })

  t.test('should tokenize and stem correctly in spanish', async (t) => {
    const tokenizer = await createTokenizer({
      language: spanishLanguage,
      stemmer: spanishStemmer,
      stopWords: spanishStopwords
    })

    const I1 = 'cociné unos pasteles'
    const I2 = 'dormir es algo dificil cuando las pruebas fallan'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['cocin', 'pastel'])
    t.strictSame(O2, ['dorm', 'dificil', 'prueb', 'fall'])
  })

  t.test('should tokenize and stem correctly in dutch', async (t) => {
    const tokenizer = await createTokenizer({
      language: dutchLanguage,
      stemmer: dutchStemmer,
      stopWords: dutchStopwords
    })
    const I1 = 'de kleine koeien'
    const I2 = 'Ik heb wat taarten gemaakt'

    const O2 = tokenizer.tokenize(I2)
    const O1 = tokenizer.tokenize(I1)

    t.strictSame(O1, ['klein', 'koei'])
    t.strictSame(O2, ['taart', 'gemaakt'])
  })

  t.test('should tokenize and stem correctly in german', async (t) => {
    const tokenizer = await createTokenizer({
      language: germanLanguage,
      stemmer: germanStemmer,
      stopWords: germanStopwords
    })

    const I1 = 'Schlaf ist eine harte Sache, wenn Tests fehlschlagen'
    const I2 = 'Ich habe ein paar Kekse gebacken'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['schlaf', 'hart', 'sach', 'test', 'fehlschlag'])
    t.strictSame(O2, ['paar', 'keks', 'geback'])
  })

  t.test('should tokenize and stem correctly in finnish', async (t) => {
    const tokenizer = await createTokenizer({
      language: finnishLanguage,
      stemmer: finnishStemmer,
      stopWords: finnishStopwords
    })

    const I1 = 'Uni on vaikea asia, kun testit epäonnistuvat'
    const I2 = 'Leivoin keksejä'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['uni', 'vaike', 'as', 'test', 'epaonnistuv'])
    t.strictSame(O2, ['leivo', 'keksej'])
  })

  t.test('should tokenize and stem correctly in danish', async (t) => {
    const tokenizer = await createTokenizer({
      language: danishLanguage,
      stemmer: danishStemmer,
      stopWords: danishStopwords
    })

    const I1 = 'Søvn er en svær ting, når prøver mislykkes'
    const I2 = 'Jeg bagte småkager'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['sovn', 'svar', 'ting', 'prov', 'mislyk'])
    t.strictSame(O2, ['bagt', 'smakag'])
  })

  t.test('should tokenize and stem correctly in tamil', async (t) => {
    const tokenizer = await createTokenizer({
      language: tamilLanguage,
      stemmer: tamilStemmer,
      stopWords: tamilStopwords
    })

    const I1 = 'கதை'
    const I2 = 'அவனிலா'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['கத'])
    t.strictSame(O2, ['அவன', 'ல'])
  })

  t.test('should tokenize and stem correctly in ukrainian', async (t) => {
    const tokenizer = await createTokenizer({
      language: ukrainianLanguage,
      stemmer: ukrainianStemmer,
      stopWords: ukrainianStopwords
    })

    const I1 = 'Коли тести не проходять, спати важко'
    const I2 = 'я приготувала тістечка'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['тест', 'не', 'проход', 'спат', 'важк'])
    t.strictSame(O2, ['я', 'приготувал', 'тістечк'])
  })

  t.test('should tokenize and stem correctly in bulgarian', async (t) => {
    const tokenizer = await createTokenizer({ language: bulgarianLanguage, stemmer: bulgarianStemmer, stopWords: [] })

    const I1 = 'Кокошката е малка крава която не може да се събере с теста'
    const I2 = 'Има първа вероятност да се случи нещо неочаквано докато се изпълняват тестовете'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.strictSame(O1, ['кокошк', 'е', 'малк', 'крав', 'коят', 'не', 'мож', 'да', 'се', 'събер', 'с', 'тест'])
    t.strictSame(O2, ['има', 'първ', 'вероятност', 'да', 'се', 'случ', 'нещ', 'неочакван', 'док', 'изпълняват', 'тест'])
  })

  t.test('disable stemming', async (t) => {
    const tokenizer = await createTokenizer({ language: 'english', stemming: false, stopWords: englishStopwords })

    const I1 = 'the quick brown fox jumps over the lazy dog'
    const I2 = 'I baked some cakes'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.same(O1, ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'])
    t.same(O2, ['baked', 'cakes'])
  })

  t.test('should validate options', async (t) => {
    await t.rejects(() => createTokenizer({ language: 'weird-language' }), { code: 'LANGUAGE_NOT_SUPPORTED' })

    await t.rejects(() => createTokenizer({ language: 'italian', stemming: true }), { code: 'MISSING_STEMMER' })

    // @ts-expect-error testing validation
    await t.rejects(() => createTokenizer({ language: 'english', stemmer: 'FOO' }), {
      code: 'INVALID_STEMMER_FUNCTION_TYPE'
    })
  })
})

t.test('Custom stop-words rules', async (t) => {
  t.test('custom array of stop-words', async (t) => {
    const tokenizer = await createTokenizer({
      language: 'english',
      stopWords: ['quick', 'brown', 'fox', 'dog'],
      stemming: true
    })

    const I1 = 'the quick brown fox jumps over the lazy dog'
    const I2 = 'I baked some cakes'

    const O1 = tokenizer.tokenize(I1)

    const O2 = tokenizer.tokenize(I2)

    t.same(O1, ['the', 'jump', 'over', 'lazi'])
    t.same(O2, ['i', 'bake', 'some', 'cake'])
  })

  t.test('custom stop-words function', async (t) => {
    const tokenizer = await createTokenizer({
      language: 'english',
      stopWords(): string[] {
        return [...englishStopwords, 'quick', 'brown', 'fox', 'dog']
      },
      stemming: true
    })

    const I1 = 'the quick brown fox jumps over the lazy dog'
    const I2 = 'I baked some cakes'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.same(O1, ['jump', 'lazi'])
    t.same(O2, ['bake', 'cake'])
  })

  t.test('disable stop-words', async (t) => {
    const tokenizer = await createTokenizer({ language: 'english', stopWords: false, stemming: true })

    const I1 = 'the quick brown fox jumps over the lazy dog'
    const I2 = 'I baked some cakes'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.same(O1, ['the', 'quick', 'brown', 'fox', 'jump', 'over', 'lazi', 'dog'])
    t.same(O2, ['i', 'bake', 'some', 'cake'])
  })

  t.test('custom stemming function', async (t) => {
    const tokenizer = await createTokenizer({
      language: 'english',
      stemmer: (word) => `${word}-ish`,
      stopWords: englishStopwords
    })

    const I1 = 'the quick brown fox jumps over the lazy dog'
    const I2 = 'I baked some cakes'

    const O1 = tokenizer.tokenize(I1)
    const O2 = tokenizer.tokenize(I2)

    t.same(O1, ['quick-ish', 'brown-ish', 'fox-ish', 'jumps-ish', 'lazy-ish', 'dog-ish'])
    t.same(O2, ['baked-ish', 'cakes-ish'])
  })

  await t.test('should validate options', async (t) => {
    // @ts-expect-error testing validation
    await t.rejects(() => createTokenizer({ language: 'english', stopWords: 'FOO' }), {
      code: 'CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY'
    })

    // @ts-expect-error testing validation
    await t.rejects(() => createTokenizer({ language: 'english', stopWords: [1, 2, 3] }), {
      code: 'CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY'
    })

    // @ts-expect-error testing validation
    await t.rejects(() => createTokenizer({ language: 'english', stopWords: {} }), {
      code: 'CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY'
    })
  })
})
