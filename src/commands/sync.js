const puppeteer = require('puppeteer')
const atob = require('atob')

const setTextInputValue = async (page, selector, value) => {
  await page.waitForTimeout(100)
  await page.evaluate(
    data => {
      return (document.querySelector(data.selector).value = data.value)
    },
    { selector, value }
  )
}

module.exports = {
  name: 'sync',
  run: async toolbox => {
    const { print, filesystem } = toolbox

    const configFilename = `${filesystem.homedir()}${
      filesystem.separator
    }.j2t-config`

    if (!filesystem.exists(configFilename)) {
      print.error('Config not found')
      print.error('Please run "j2t configure"')
      return
    }

    const config = JSON.parse(atob(await filesystem.read(configFilename)))

    const spinnerJiraGetData = print.spin('Get data of Jira')

    const browser = await puppeteer.launch({
      headless: true
    })

    const page = await browser.newPage()
    await page.goto(
      'http://jira.btfinanceira.com.br/login.jsp?permissionViolation=true&os_destination=%2Fsecure%2FCalendarWebAction%21default.jspa&page_caps=&user_role=',
      {
        waitUntil: 'networkidle2'
      }
    )

    await page.type('#login-form-username', config.jira.user)
    await page.type('#login-form-password', config.jira.password)
    await page.click('#login-form-submit')

    page.on('response', async response => {
      if (response.url().includes('worklogs')) {
        const jiraData = await response.json()

        spinnerJiraGetData.succeed('Jira get data successful')

        const hours = jiraData.reduce((acc, item) => {
          const group = item.startDate

          if (!acc.hasOwnProperty(group)) {
            acc[group] = {
              sumary: item.issueSummary,
              items: []
            }
          }

          acc[group].items.push({
            start: item.startTime,
            end: item.endTime
          })

          return acc
        }, {})

        const spinnerTradingWorksAuth = print.spin('TradingWorks auth')

        const tradingWorksPage = await browser.newPage()
        await tradingWorksPage.goto('https://app.tradingworks.net')

        await tradingWorksPage.type(
          '#Body_Body_txtUserName',
          config.tradingWorks.email
        )
        await tradingWorksPage.type(
          '#Body_Body_txtPassword',
          config.tradingWorks.password
        )
        await tradingWorksPage.click('#Body_Body_LoginButton')

        let tradingWorksLoginSuccess = false
        await tradingWorksPage
          .waitForSelector('#Body_Body_pnlMessage.alert.alert-warning', {
            visible: true,
            timeout: 2000
          })
          .catch(() => {
            tradingWorksLoginSuccess = true
          })

        if (!tradingWorksLoginSuccess) {
          spinnerTradingWorksAuth.fail('TradingWorks Auth failed')
          await browser.close()
          return
        }

        const employeeId = await tradingWorksPage.evaluate(() => {
          return document
            .querySelector('#Body_Body_lnkEditAttendance')
            .href.split('&')[0]
            .split('=')[1]
        })

        spinnerTradingWorksAuth.succeed('TradingWorks Auth successful')

        const spinnerTimes = print.spin('TradingWorks save times')

        for (const [date, { items, sumary }] of Object.entries(hours)) {
          await tradingWorksPage.goto(
            `https://app.tradingworks.net/Attendances/EditAttendance.aspx?EmployeeID=${employeeId}&basedate=${date}`
          )

          const qtdHours = await tradingWorksPage.evaluate(() => {
            return [
              ...document.querySelectorAll(
                '#form1 > div.container > div:nth-child(5) > div.table-responsive > table > tbody > tr'
              )
            ].length
          })

          if (qtdHours === 0) {
            await tradingWorksPage.click('#aShowTimes')

            await tradingWorksPage.type(
              '#Body_Body_txtTimeRequested',
              items[0].start
            )
            await tradingWorksPage.type(
              '#Body_Body_txtTimeRequested2',
              items[0].end
            )
            await tradingWorksPage.type(
              '#Body_Body_txtTimeRequested3',
              items[1].start
            )
            await tradingWorksPage.type(
              '#Body_Body_txtTimeRequested4',
              items[1].end
            )

            await tradingWorksPage.click('#Body_Body_btnAddRequested')

            await page.waitForTimeout(100)

            await setTextInputValue(
              tradingWorksPage,
              '#Body_Body_txtLogBook',
              sumary
            )

            await tradingWorksPage.click('#Body_Body_btnSaveLogBook')
            await page.waitForTimeout(1000)
          }
        }

        spinnerTimes.succeed('Times inserted successfully')

        browser.close()
        print.success('Completed')
      }
    })
  }
}
