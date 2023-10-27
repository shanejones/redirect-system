const fs = require('fs');

require('dotenv').config();
const DOCUMENT_ID = process.env.DOCUMENT_ID
const SHEET_ID = process.env.SHEET_ID

function relativeUrlCheck(url) {
  const relativePattern = new RegExp(
    '^\\/[-a-z\\d%_.~+]*' +
    '(\\/[-a-z\\d%_.~+]*)*' +
    '(\\?[;&a-z\\d%_.~+=-]*)?' +
    '(\\#[-a-z\\d_]*)?$', 'i'
  )

  return !!relativePattern.test(url)
}
function absoluteUrlCheck(url) {
  const absolutePattern = new RegExp(
    '^(https?:\\/\\/)+' +
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,})'+ 
    '(\\/[-a-z\\d%_.~+]*)*'+
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ 
    '(\\#[-a-z\\d_]*)?$', 'i'
  )

  return !!absolutePattern.test(url)
}

function statusCodeCheck(statusCode) {
  const acceptableStatusCodes = [301, 302]

  return acceptableStatusCodes.includes(statusCode)
}

if (DOCUMENT_ID && SHEET_ID) {
  
  const PublicGoogleSheetsParser = require('public-google-sheets-parser')
  
  const parser = new PublicGoogleSheetsParser(DOCUMENT_ID, { sheetId: SHEET_ID })
  
  let hasErrors = false
  parser.parse().then((items) => {
    let output = ''

    items.forEach((item, line) => {
      const spreadsheetRow = line + 1
      let testsPass = true
      
      const fromCheck = relativeUrlCheck(item.from, true)
      const toCheck = absoluteUrlCheck(item.to)
      const statusCheck = statusCodeCheck(item.status)

      if (!fromCheck) {
        console.error(`SPREADSHEET ERROR - Invalid From URL on Spreadsheet Row ${spreadsheetRow}`)
        testsPass = false
      }
      
      if (!toCheck) {
        console.error(`SPREADSHEET ERROR - Invalid To URL on Spreadsheet Row ${spreadsheetRow}`)
        testsPass = false
      }
      
      if (!statusCheck) {
        console.error(`SPREADSHEET ERROR - Invalid Status Code on Spreadsheet Row ${spreadsheetRow}`)
        testsPass = false
      }

      if (testsPass) { 
        const thisRedirect = `[[redirects]]\n` +
        `  from = "${item.from}"\n` +
        `  to = "${item.to}"\n` +
        `  status = ${item.status}\n\n`
        
        output = output + thisRedirect
      } else {
        hasErrors = true
      }
      
    })

    if (!hasErrors) { 
      fs.writeFile('netlify.toml', output, function (error) {
        if (error) throw error;
      });
    } else {
      console.error('Please check through the errors above to resolve the issues in this deploy.')
      process.exit(1);
    }
    
  }) 
} else {
  if(!DOCUMENT_ID) { 
    console.error('ENV VAR ERROR - DOCUMENT_ID is missing from the Environment Variables')
  }
  if(!SHEET_ID) { 
    console.error('ENV VAR ERROR - SHEET_ID is missing from the Environment Variables') 
  }
  console.error('Please check through the errors above to resolve the issues in this deploy.')
  process.exit(1);
}
