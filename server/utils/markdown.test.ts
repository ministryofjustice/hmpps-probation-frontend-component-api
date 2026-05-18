import fs from 'fs'
import renderMarkdown, { getMarkdownPath } from './markdown'

jest.mock('fs')

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

describe('renderMarkdown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders a paragraph with govuk-body class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('Hello world')
    const html = renderMarkdown('test-page')
    expect(html).toContain('<p class="govuk-body">Hello world</p>')
  })

  it('renders h1 with govuk-heading-xl class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('# Title')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-heading-xl')
    expect(html).toContain('</h1>')
  })

  it('renders h2 with govuk-heading-l class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('## Subtitle')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-heading-l')
  })

  it('renders h3 with govuk-heading-m class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('### Section')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-heading-m')
  })

  it('renders h4 with govuk-heading-s class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('#### Small')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-heading-s')
  })

  it('falls back to govuk-heading-s for h5 and beyond', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('##### Tiny')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-heading-s')
  })

  it('renders links with govuk-link class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('[click](https://example.com)')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-link')
    expect(html).toContain('href="https://example.com"')
  })

  it('renders bullet lists with govuk-list--bullet class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('- item one\n- item two')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-list govuk-list--bullet')
  })

  it('renders ordered lists with govuk-list--number class', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('1. first\n2. second')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-list govuk-list--number')
  })

  it('renders horizontal rules with govuk-section-break classes', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('---')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-section-break')
    expect(html).toContain('govuk-section-break--xl')
    expect(html).toContain('govuk-section-break--visible')
  })

  it('renders tables with govuk-table classes', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('| A | B |\n|---|---|\n| 1 | 2 |')
    const html = renderMarkdown('test-page')
    expect(html).toContain('govuk-table')
    expect(html).toContain('govuk-table__head')
    expect(html).toContain('govuk-table__body')
    expect(html).toContain('govuk-table__row')
    expect(html).toContain('govuk-table__header')
    expect(html).toContain('govuk-table__cell')
  })

  it('reads from the correct resolved path', () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('text')
    renderMarkdown('subdir/page')
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('content/subdir/page.md'), 'utf8')
  })
})
