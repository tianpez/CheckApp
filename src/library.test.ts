import { describe, expect, it } from 'vitest'
import { LIBRARY_ARTICLES, searchLibraryArticles } from './library'

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
