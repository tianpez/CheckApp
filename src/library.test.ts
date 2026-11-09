import { describe, expect, it } from 'vitest'
import {
  LIBRARY_ARTICLES,
  parseLibraryArticleInput,
  searchLibraryArticles,
} from './library'

const tutorialInput = {
  category: 'Buffet',
  title: 'Montaje de estación fría',
  summary: 'Pasos para organizar la estación fría.',
  keywords: ['estación fría', 'buffet'],
  steps: ['Preparar recipientes', 'Revisar temperaturas'],
  images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w=='],
}

describe('searchLibraryArticles', () => {
  it('returns all articles for an empty query and category', () => {
    expect(searchLibraryArticles(LIBRARY_ARTICLES, '', '')).toHaveLength(LIBRARY_ARTICLES.length)
  })

  it('finds articles by keywords and searches without accent sensitivity', () => {
    expect(searchLibraryArticles(LIBRARY_ARTICLES, 'orden presentacion buffet', '')).toEqual([
      expect.objectContaining({ id: 'orden-presentacion-buffet' }),
    ])
    expect(searchLibraryArticles(LIBRARY_ARTICLES, 'coctel hierbabuena', '')).toEqual([
      expect.objectContaining({ id: 'receta-mojito' }),
    ])
  })

  it('searches article steps as well as titles and keywords', () => {
    expect(searchLibraryArticles(LIBRARY_ARTICLES, 'cruces esperas', '')).toEqual([
      expect.objectContaining({ id: 'orden-presentacion-buffet' }),
    ])
  })

  it('applies the selected category along with the query', () => {
    expect(searchLibraryArticles(LIBRARY_ARTICLES, 'receta', 'Cócteles').map((article) => article.id)).toEqual([
      'receta-mojito',
      'receta-gin-tonic',
    ])
    expect(searchLibraryArticles(LIBRARY_ARTICLES, 'receta', 'Buffet')).toEqual([])
  })

  it('returns no articles when no keyword matches', () => {
    expect(searchLibraryArticles(LIBRARY_ARTICLES, 'palabra inexistente', '')).toEqual([])
  })
})

describe('parseLibraryArticleInput', () => {
  it('normalizes and validates a tutorial with multiple images', () => {
    const secondImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w=='
    expect(parseLibraryArticleInput({
      ...tutorialInput,
      title: '  Montaje de estación fría  ',
      keywords: ['buffet', ' buffet '],
      steps: [' Preparar recipientes '],
      images: [...tutorialInput.images, secondImage],
    })).toEqual({
      ...tutorialInput,
      title: 'Montaje de estación fría',
      keywords: ['buffet'],
      steps: ['Preparar recipientes'],
      images: [...tutorialInput.images, secondImage],
    })
  })

  it('rejects tutorials without images or with invalid fields', () => {
    expect(() => parseLibraryArticleInput({ ...tutorialInput, images: [] }))
      .toThrow('Añade entre 1 y 8 imágenes JPG válidas')
    expect(() => parseLibraryArticleInput({ ...tutorialInput, images: Array(9).fill(tutorialInput.images[0]) }))
      .toThrow('Añade entre 1 y 8 imágenes JPG válidas')
    expect(() => parseLibraryArticleInput({ ...tutorialInput, category: 'Otra' }))
      .toThrow('Selecciona una categoría válida')
    expect(() => parseLibraryArticleInput({ ...tutorialInput, steps: [] }))
      .toThrow('Añade entre 1 y 30 pasos')
  })

  it('accepts a legacy single image and rejects an oversized image collection', () => {
    const { images, ...legacyInput } = tutorialInput
    expect(parseLibraryArticleInput({ ...legacyInput, image: images[0] }).images).toEqual(images)
    expect(() => parseLibraryArticleInput({
      ...tutorialInput,
      images: [`data:image/jpeg;base64,${'a'.repeat(2_500_000)}`],
    })).toThrow('El tamaño total de las imágenes optimizadas')
  })
})
