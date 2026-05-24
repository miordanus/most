import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRu, fuzzyMatch } from './normalize'

test('normalizeRu folds ё→е, strips punctuation, lowercases, collapses whitespace', () => {
  assert.equal(normalizeRu('Клуб-Сэндвич, с куриным филе'), 'клуб сэндвич с куриным филе')
  assert.equal(normalizeRu('Ёжик'), 'ежик')
  assert.equal(normalizeRu('  multiple   spaces  '), 'multiple spaces')
})

test('fuzzyMatch returns true for substring after normalization', () => {
  assert.equal(fuzzyMatch('Чизбургер', 'чиз'), true)
  assert.equal(fuzzyMatch('Клаб-сэндвич с куриным филе', 'клуб сэндвич'), false)
  assert.equal(fuzzyMatch('Клуб-сэндвич с куриным филе', 'клуб сэндвич'), true)
  assert.equal(fuzzyMatch('Цезарь', 'кесарь'), false)
})

test('fuzzyMatch tolerates word-order-insensitive token match', () => {
  assert.equal(fuzzyMatch('Куриный салат с пармезаном', 'пармезан куриный'), true)
  assert.equal(fuzzyMatch('Куриный салат', 'грибной'), false)
})
