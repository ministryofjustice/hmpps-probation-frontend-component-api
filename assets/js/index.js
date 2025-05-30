import * as govukFrontend from 'govuk-frontend'
import * as mojFrontend from '@ministryofjustice/frontend'

govukFrontend.initAll()
mojFrontend.initAll()

document.addEventListener('DOMContentLoaded', function onLoad() {
  const wrapper = document.getElementById('js-back-wrapper')
  const link = document.createElement('a')
  link.textContent = 'Back'
  link.classList = 'govuk-back-link'
  link.addEventListener('click', function handleClick(e) {
    e.preventDefault()
    window.history.back()
  })

  wrapper.appendChild(link)
})
