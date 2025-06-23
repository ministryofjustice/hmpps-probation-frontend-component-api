import { getMarkdownPath } from './markdown'

describe('get markdown path', () => {
  it.each([
    ['markdownPage', { directory: 'content', fileName: 'markdownPage' }],
    ['directory1/markdownPage', { directory: 'content/directory1', fileName: 'markdownPage' }],
    [
      'directory1/subdirectory/markdownPage',
      { directory: 'content/directory1/subdirectory', fileName: 'markdownPage' },
    ],
  ])('getMarkdownPath(%s) should be %s', (path: string, expected: { directory: string; fileName: string }) => {
    expect(getMarkdownPath(path)).toEqual(expected)
  })
})
