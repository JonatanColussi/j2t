const puppeteer = require('puppeteer')
const btoa = require('btoa')

const command = {
  name: 'configure',
  run: async (toolbox) => {
    const { print, prompt, filesystem } = toolbox

    const configFilename = `${filesystem.homedir()}${
      filesystem.separator
    }.j2t-config`

    if (filesystem.exists(configFilename)) {
      print.info('j2t is already configured on this computer')

      const { overwriteConfig } = await prompt.ask([
        {
          type: 'confirm',
          name: 'overwriteConfig',
          message: 'Do you want to overwrite the settings?',
          default: false
        }
      ])

      if (!overwriteConfig) {
        return
      }
    }

    const { jiraUser, jiraPassword } = await prompt.ask([
      {
        type: 'input',
        name: 'jiraUser',
        message: 'What is your Jira user?'
      },
      {
        type: 'password',
        name: 'jiraPassword',
        message: 'What is your Jira password?'
      }
    ])

    const jiraData = { user: jiraUser.trim(), password: jiraPassword.trim() }

    const spinnerJiraAuth = print.spin('Jira auth')

    const browser = await puppeteer.launch({
      headless: true
    })
    
    const pageJira = await browser.newPage()

    await pageJira.goto('http://jira.bancotopazio.com.br/login.jsp')

    await pageJira.type('#login-form-username', jiraData.user)
    await pageJira.type('#login-form-password', jiraData.password)
    await pageJira.click('#login-form-submit')

    let jiraLoginSuccess = false
    await pageJira
      .waitForSelector('.aui-message.error', { visible: true, timeout: 2000 })
      .catch(() => {
        jiraLoginSuccess = true
      })

    if (!jiraLoginSuccess) {
      spinnerJiraAuth.fail('Jira Auth failed')
      await browser.close()
      return
    }

    await pageJira.close()
    spinnerJiraAuth.succeed('Jira Auth successful')

    const { tradingWorksEmail, tradingWorksPassword } = await prompt.ask([
      {
        type: 'input',
        name: 'tradingWorksEmail',
        message: 'What is your Trading Works email?'
      },
      {
        type: 'password',
        name: 'tradingWorksPassword',
        message: 'What is your Trading Works password?'
      }
    ])

    const tradingWorksData = {
      email: tradingWorksEmail.trim(),
      password: tradingWorksPassword.trim()
    }

    const spinnerTradingWorksAuth = print.spin('TradingWorks auth')

    const pageTradingWorks = await browser.newPage()
    await pageTradingWorks.goto('https://app.tradingworks.net')

    await pageTradingWorks.type(
      '#Body_Body_txtUserName',
      tradingWorksData.email
    )
    await pageTradingWorks.type(
      '#Body_Body_txtPassword',
      tradingWorksData.password
    )
    await pageTradingWorks.click('#Body_Body_LoginButton')

    let tradingWorksLoginSuccess = false
    await pageTradingWorks
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

    await browser.close()

    spinnerTradingWorksAuth.succeed('TradingWorks Auth successful')

    filesystem.write(
      configFilename,
      btoa(
        JSON.stringify({
          jira: jiraData,
          tradingWorks: tradingWorksData
        })
      )
    )

    print.success('Config finished')
  }
}

module.exports = command
