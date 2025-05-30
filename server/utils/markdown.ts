import MarkdownIt from 'markdown-it'
import path from 'path'
import fs from 'fs'
import { RenderRule } from 'markdown-it/lib/renderer.mjs'

const md = new MarkdownIt()

const getRendererFor = (rule: string): RenderRule => {
  return md.renderer.rules[rule] || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
}

const headingsRenderer = getRendererFor('heading_open')

md.renderer.rules.heading_open = (tokens, idx, options, env, self): string => {
  const level = tokens[idx].tag.replace(/^h(:?\d{1}?)/, '$1')
  const headingLevel = Number(level)
  const headingLevels = ['xl', 'l', 'm', 's']

  const headingClassSuffix = headingLevels[headingLevel - 1] || headingLevels.at(-1)

  tokens[idx].attrPush(['class', `govuk-heading-${headingClassSuffix}`])
  return headingsRenderer(tokens, idx, options, env, self)
}

const addClassesToRule = ([rule, classes]: string[]) => {
  const renderer = getRendererFor(rule)
  md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
    const token = tokens[idx]

    if (token.attrGet('class')) {
      token.attrJoin('class', classes)
    } else {
      token.attrPush(['class', classes])
    }

    return renderer(tokens, idx, options, env, self)
  }
}

Object.entries({
  paragraph_open: 'govuk-body',
  link_open: 'govuk-link',
  bullet_list_open: 'govuk-list govuk-list--bullet',
  ordered_list_open: 'govuk-list govuk-list--number',
  hr: 'govuk-section-break govuk-section-break--xl govuk-section-break--visible',
  table_open: 'govuk-table',
  thead_open: 'govuk-table__head',
  tbody_open: 'govuk-table__body',
  tr_open: 'govuk-table__row',
  th_open: 'govuk-table__header',
  td_open: 'govuk-table__cell',
}).forEach(addClassesToRule)

function renderContent(content: string) {
  const baseDir = path.resolve(process.cwd(), 'content')
  const markdown = fs.readFileSync(path.join(baseDir, `${content}.md`), 'utf8')
  const rendered = md.render(markdown)

  return rendered
}

export default function renderMarkdown(content: string): string {
  return renderContent(content)
}
