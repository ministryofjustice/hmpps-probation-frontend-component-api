document.addEventListener('DOMContentLoaded', function onLoad() {
  const wrapper = document.getElementById('js-back-wrapper')
  const link = document.createElement('a')
  link.textContent = 'Back'
  link.classList = 'govuk-back-link'
  if (wrapper) {
    link.addEventListener('click', function handleClick(e) {
      window.history.back()
    })

    wrapper.appendChild(link)
  }
})
