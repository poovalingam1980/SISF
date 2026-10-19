/**
 * SISF 2026 - தென்னிந்திய அறிவியல் கண்காட்சி
 * பள்ளி இணைய முகப்பு & பதிவு மேலாண்மை தளம் (School Portal Backend)
 * 
 * முதன்மை இணைப்புகள்:
 * 1. Master Spreadsheet ID: 1QesgNBu6tHCgM5xNIwfi4rwvU8quM2y7qXOc47_A64o (பள்ளி விவரங்கள்)
 * 2. Active Application Spreadsheet: South India Science Fair Registration Form
 * 
 * பாதுகாப்பு அம்சங்கள்:
 * 1. முதல் முறை பதிவு செய்யும் போது பள்ளியின் மின்னஞ்சலுக்கு கடவுச்சொல் அனுப்பப்படும்.
 * 2. கடவுச்சொல்லை மீட்டமைக்க (Password Reset) பள்ளியின் மின்னஞ்சலுக்கு 6 இலக்க OTP அனுப்பப்பட்டு,
 *    அந்த OTP-ஐ உள்ளிட்டால் மட்டுமே புதிய கடவுச்சொல் அமைக்க முடியும் (Email OTP Verification).
 * 3. விண்ணப்பங்கள் சமர்ப்பிக்கப்படும் போது அதிகாரப்பூர்வ A4 PDF மின்னஞ்சல் இணைப்பாகச் செல்லும்.
 */

var MASTER_SPREADSHEET_ID = "1QesgNBu6tHCgM5xNIwfi4rwvU8quM2y7qXOc47_A64o";
var SHEET_SCHOOLS = "Schools_Auth";
var SHEET_APPLICATIONS = "SISF_Applications";
var SENDER_DISPLAY_NAME = "SIVAGANGAI DISTRICT SCHOOL EDUCATION DEPARTMENT";

function setupSystem() {
  Logger.log("=== SISF 2026 System Setup Started ===");
  var sheets = getOrCreateSheets();
  Logger.log("✅ Schools_Auth & SISF_Applications தாள்கள் தயார்.");
  
  try {
    var masterSs = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
    var masterSheet = masterSs.getSheetByName("Form") || masterSs.getSheets()[0];
    Logger.log("✅ Master Sheet இணைப்பு வெற்றி. மொத்தம் " + masterSheet.getLastRow() + " வரிகள் உள்ளன.");
  } catch (err) {
    Logger.log("⚠️ Master Sheet அணுகல் பிழை: " + err.toString());
  }
  
  var myEmail = Session.getActiveUser().getEmail() || "poovalingam1980@gmail.com";
  try {
    MailApp.sendEmail({
      to: myEmail,
      name: SENDER_DISPLAY_NAME,
      subject: "SISF 2026 - அமைப்பு மற்றும் மின்னஞ்சல் சேவை தயார் (Setup Successful)",
      body: "வணக்கம்! தங்களின் SISF 2026 Google Apps Script தளம் மற்றும் மின்னஞ்சல் சேவை வெற்றிகரமாகச் செயல்படத் தொடங்கிவிட்டது.\n\nGoogle Sheet: South India Science Fair Registration Form\nநிலை: தயார் (Active)"
    });
    Logger.log("✅ சோதனை மின்னஞ்சல் அனுப்பப்பட்டது: " + myEmail);
  } catch (err) {
    Logger.log("⚠️ மின்னஞ்சல் அனுப்புவதில் பிழை: " + err.toString());
  }
  Logger.log("=== அமைப்பு முழுமை பெற்றது! ===");
}

function testSendEmail() {
  setupSystem();
}

function doGet(e) {
  try {
    var p = e ? (e.parameter || {}) : {};
    var action = p.action;
    var callback = p.callback;
    var output;
    
    if (action === "reset_all_data" || action === "clear_all_data") {
      output = resetAllSystemData();
    } else if (action === "clear_schools_data" || action === "reset_schools_data") {
      output = resetSchoolAuthData();
    } else if (action === "lookup_school") {
      output = lookupSchoolInMaster(p.query);
    } else if (action === "send_reg_otp") {
      output = handleSendRegOtp(p);
    } else if (action === "school_register") {
      output = handleSchoolRegister(p);
    } else if (action === "send_reset_otp") {
      output = handleSendResetOtp(p);
    } else if (action === "verify_otp_and_reset") {
      output = handleVerifyOtpAndReset(p);
    } else if (action === "school_login") {
      output = handleLogin(p.username, p.password);
    } else if (action === "get_school_data") {
      output = handleGetSchoolData(p.udiseNo);
    } else if (action === "admin_reset_school_password") {
      output = handleAdminResetSchoolPassword(p);
    } else if (action === "admin_save_winner") {
      output = handleAdminSaveWinner(p);
    } else if (action === "admin_delete_application") {
      output = handleAdminDeleteApplication(p);
    } else if (action === "admin_delete_school") {
      output = handleAdminDeleteSchool(p);
    } else {
      output = {
        status: "active",
        message: "SISF 2026 School Portal Backend is operational with OTP Security."
      };
    }
    
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + JSON.stringify(output) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(output))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    var errObj = { status: "error", message: error.toString() };
    if (e && e.parameter && e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + "(" + JSON.stringify(errObj) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(errObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    var action = data.action;
    var output;
    
    if (action === "reset_all_data" || action === "clear_all_data") {
      return ContentService.createTextOutput(JSON.stringify(resetAllSystemData())).setMimeType(ContentService.MimeType.JSON);
    } else if (action === "lookup_school") {
      output = lookupSchoolInMaster(data.query);
    } else if (action === "send_reg_otp") {
      output = handleSendRegOtp(data);
    } else if (action === "school_register") {
      output = handleSchoolRegister(data);
    } else if (action === "send_reset_otp") {
      output = handleSendResetOtp(data);
    } else if (action === "verify_otp_and_reset") {
      output = handleVerifyOtpAndReset(data);
    } else if (action === "school_login") {
      output = handleLogin(data.username, data.password);
    } else if (action === "save_application") {
      output = handleSaveApplication(data);
    } else if (action === "get_school_data") {
      output = handleGetSchoolData(data.udiseNo);
    } else if (action === "admin_reset_school_password") {
      output = handleAdminResetSchoolPassword(data);
    } else if (action === "admin_save_winner") {
      output = handleAdminSaveWinner(data);
    } else if (action === "admin_delete_application") {
      output = handleAdminDeleteApplication(data);
    } else if (action === "admin_delete_school") {
      output = handleAdminDeleteSchool(data);
    } else {
      output = { status: "error", message: "அறியப்படாத கோரிக்கை (Unknown action)." };
    }
    
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// மாஸ்டர் விரிதாளில் பள்ளியைத் தேடுதல்
function lookupSchoolInMaster(query) {
  query = (query || "").toString().trim();
  if (!query) {
    return { status: "error", message: "தயவுசெய்து U.NO அல்லது UDISE எண்ணை உள்ளிடவும்." };
  }
  
  var cleanQ = query.replace(/^0+/, "");
  
  try {
    var masterSs = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
    var masterSheet = masterSs.getSheetByName("Form") || masterSs.getSheets()[0];
    var data = masterSheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var uNo = (row[0] || "").toString().trim();
      var udise = (row[1] || "").toString().trim();
      var cleanUNo = uNo.replace(/^0+/, "");
      
      var match = false;
      if (uNo === query || udise === query || cleanUNo === cleanQ) {
        match = true;
      } else if (!isNaN(parseInt(uNo, 10)) && !isNaN(parseInt(query, 10)) && parseInt(uNo, 10) === parseInt(query, 10)) {
        match = true;
      }
      
      if (match) {
        var m1 = (row[7] || "").toString().trim();
        var mgmt = "Government";
        if (m1.indexOf("2") !== -1 || m1.toUpperCase().indexOf("A") !== -1) {
          mgmt = "Govt. Aided";
        } else if (m1.indexOf("3") !== -1 || m1.toUpperCase().indexOf("P") !== -1) {
          mgmt = "Private";
        }
        
        var schoolObj = {
          uNo: uNo,
          udiseNo: udise,
          nameEn: (row[2] || "").toString().replace(/\n/g, " ").trim(),
          nameTa: (row[3] || "").toString().replace(/\n/g, " ").trim(),
          schoolType: (row[6] || "").toString().replace(/\n/g, " ").trim() || "HS",
          management: mgmt,
          block: (row[12] || "").toString().replace(/\n/g, " ").trim(),
          hmName: (row[13] || "").toString().replace(/\n/g, " ").trim(),
          hmNameTa: (row[14] || "").toString().replace(/\n/g, " ").trim(),
          mobile: (row[15] || "").toString().replace(/\n/g, " ").trim()
        };
        
        var isAlreadyRegistered = checkIfSchoolRegistered(udise);
        
        return {
          status: "success",
          found: true,
          alreadyRegistered: isAlreadyRegistered,
          school: schoolObj
        };
      }
    }
    
    return {
      status: "error",
      found: false,
      message: "குறிப்பிட்ட U.NO அல்லது UDISE எண்ணில் (" + query + ") பள்ளி விவரங்கள் காணப்படவில்லை."
    };
    
  } catch (err) {
    return {
      status: "error",
      message: "மாஸ்டர் விரிதாளை அணுகுவதில் பிழை: " + err.toString()
    };
  }
}

function checkIfSchoolRegistered(udise) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.schoolSheet;
  var rows = sheet.getDataRange().getValues();
  var cleanU = (udise || "").toString().trim();
  if (!cleanU) return false;
  for (var i = 1; i < rows.length; i++) {
    var cellU = (rows[i][0] || "").toString().trim();
    if (cellU && cellU === cleanU) {
      return true;
    }
  }
  return false;
}

// விரிதாள் தாள்களைத் தயார் செய்தல் (Col 13 = Reset OTP, Col 14 = OTP Timestamp)
function getOrCreateSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var schoolSheet = ss.getSheetByName(SHEET_SCHOOLS);
  if (!schoolSheet) {
    schoolSheet = ss.insertSheet(SHEET_SCHOOLS);
    schoolSheet.appendRow([
      "UDISE NO", "U.NO", "School Name (English)", "பள்ளியின் பெயர் (தமிழ்)", 
      "Block", "School Phone", "School Email", "School Type / Management", 
      "Headmaster Name", "Password", "Registered At", "Last Password Reset",
      "Reset OTP", "OTP Timestamp"
    ]);
    formatHeaderRow(schoolSheet, 14, "#2b6cb0");
  }
  
  var appSheet = ss.getSheetByName(SHEET_APPLICATIONS);
  if (!appSheet) {
    appSheet = ss.insertSheet(SHEET_APPLICATIONS);
    appSheet.appendRow([
      "Timestamp", "Reg No", "UDISE NO", "U.NO",
      "School Name & Address", "PIN Code", "School Phone", "School Email",
      "School Management", "Category of Entry",
      "Student 1 Name", "Student 1 Class", "Student 1 Sex",
      "Student 2 Name", "Student 2 Class", "Student 2 Sex",
      "Guide Teacher Name", "Guide Teacher Designation",
      "Guide Teacher Mobile", "Guide Teacher Email",
      "Exhibit Subject / Discipline", "Exhibit Title",
      "Nature of Model", "Stall Requirements",
      "Brief Concept / Abstract", "Declaration Accepted"
    ]);
    formatHeaderRow(appSheet, 26, "#1a365d");
  }
  
  return { schoolSheet: schoolSheet, appSheet: appSheet };
}

function formatHeaderRow(sheet, numCols, bgColor) {
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground(bgColor);
  range.setFontColor("#ffffff");
  range.setFontWeight("bold");
  range.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 35);
}

// பள்ளிப் பதிவு
function handleSchoolRegister(data) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.schoolSheet;
  var udise = (data.udiseNo || "").toString().trim();
  var uNo = (data.uNo || "").toString().trim();
  var password = (data.password || "").toString().trim();
  var email = fixEmailTyposServer((data.schoolEmail || "").toString().trim());
  
  if (!udise || udise.length !== 11) {
    return { status: "error", message: "UDISE எண் 11 இலக்கங்களாக இருக்க வேண்டும்." };
  }
  if (!password || password.length < 4) {
    return { status: "error", message: "கடவுச்சொல் குறைந்தது 4 எழுத்துகளாக இருக்க வேண்டும்." };
  }
  if (!email || email.indexOf("@") === -1) {
    return { status: "error", message: "சரியான பள்ளியின் மின்னஞ்சல் முகவரியை உள்ளிடவும்." };
  }
  
  var cleanUno = uNo.replace(/^0+/, "").trim();
  // Remove any stale school registration row and purge old participant applications when re-registering
  if (sheet.getLastRow() > 1) {
    var sRows = sheet.getDataRange().getValues();
    for (var sIdx = sRows.length - 1; sIdx >= 1; sIdx--) {
      var rUd = (sRows[sIdx][0] || "").toString().trim();
      var rUn = (sRows[sIdx][1] || "").toString().replace(/^0+/, "").trim();
      if ((udise && rUd === udise) || (cleanUno && rUn === cleanUno)) {
        sheet.deleteRow(sIdx + 1);
      }
    }
  }
  handleAdminDeleteApplication({ uNo: cleanUno, udiseNo: udise, category: "ALL" });
  
  var now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  sheet.appendRow([
    udise,
    uNo,
    data.nameEn || "",
    data.nameTa || "",
    data.block || "",
    data.schoolContact || data.mobile || "",
    email,
    data.schoolManagement || data.management || "Government",
    data.hmName || "",
    password,
    now,
    "", // Last reset
    "", // Reset OTP
    ""  // OTP Timestamp
  ]);
  
  var schoolObj = {
    udiseNo: udise,
    uNo: uNo,
    schoolAddress: (data.nameTa || data.nameEn || "") + (data.block ? " (" + data.block + ")" : ""),
    nameTa: data.nameTa || "",
    nameEn: data.nameEn || "",
    pinCode: data.pinCode || "630xxx",
    schoolContact: data.schoolContact || data.mobile || "",
    schoolEmail: email,
    schoolManagement: data.schoolManagement || data.management || "Government",
    block: data.block || "",
    hmName: data.hmName || ""
  };
  
  sendCredentialsEmail(schoolObj, password, false);
  
  return {
    status: "success",
    message: "தங்கள் பள்ளியின் விவரங்கள் பதிவு செய்யப்பட்டது. login செய்க / Your school details have been registered successfully. Please login.",
    school: schoolObj,
    applications: { Individual: null, Group: null, Teacher: null }
  };
}

// =========================================================================
// 4. மின்னஞ்சலுக்கு OTP அனுப்புதல் (Send Password Reset OTP to School Email)
// =========================================================================
function handleSendResetOtp(data) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.schoolSheet;
  var username = (data.username || "").toString().trim();
  
  if (!username) {
    return { status: "error", message: "தயவுசெய்து UDISE எண் அல்லது U.NO-வை உள்ளிடவும்." };
  }
  
  var cleanU = username.replace(/^0+/, "");
  var rows = sheet.getDataRange().getValues();
  var targetRowIdx = -1;
  var schoolObj = null;
  
  for (var i = 1; i < rows.length; i++) {
    var rUdise = (rows[i][0] || "").toString().trim();
    var rUNo = (rows[i][1] || "").toString().trim();
    var cleanRUNo = rUNo.replace(/^0+/, "");
    
    if (rUdise === username || rUNo === username || cleanRUNo === cleanU) {
      targetRowIdx = i + 1;
      schoolObj = {
        udiseNo: rUdise,
        uNo: rUNo,
        nameEn: rows[i][2],
        nameTa: rows[i][3],
        schoolContact: rows[i][5],
        schoolEmail: rows[i][6],
        block: rows[i][4]
      };
      break;
    }
  }
  
  if (targetRowIdx === -1 || !schoolObj) {
    return { 
      status: "error", 
      message: "இந்த UDISE / U.NO எண்ணில் பதிவு செய்யப்பட்ட பள்ளி ஏதும் காணப்படவில்லை." 
    };
  }
  
  var rawEmail = (schoolObj.schoolEmail || data.email || "").toString().trim();
  var email = fixEmailTyposServer(rawEmail);
  if (!email || email.indexOf("@") === -1) {
    return { 
      status: "error", 
      message: "இப்பள்ளிக்கு மின்னஞ்சல் முகவரி பதிவு செய்யப்படவில்லை." 
    };
  }
  // Auto-heal email typo in Schools_Auth (e.g., @gmai.com -> @gmail.com)
  if (email !== rawEmail) {
    sheet.getRange(targetRowIdx, 7).setValue(email);
    schoolObj.schoolEmail = email;
  }
  
  // 6 இலக்க ரகசிய OTP உருவாக்குதல் (Use client-synced 6-digit OTP if provided)
  var clientOtp = (data.otp || "").toString().trim();
  var otp = (/^[0-9]{6}$/.test(clientOtp)) ? clientOtp : Math.floor(100000 + Math.random() * 900000).toString();
  var now = new Date().getTime(); // timestamp in ms
  
  // விரிதாள் மற்றும் CacheService-ல் சேமித்தல் (15 நிமிடங்கள் செல்லும்)
  sheet.getRange(targetRowIdx, 13).setValue(otp);
  sheet.getRange(targetRowIdx, 14).setValue(now);
  
  var cache = CacheService.getScriptCache();
  cache.put("OTP_" + schoolObj.udiseNo, otp, 900); // 15 mins
  
  // மின்னஞ்சலுக்கு OTP அனுப்புதல் (SIVAGANGAI DISTRICT SCHOOL EDUCATION DEPARTMENT பெயரில்)
  sendOtpEmail(schoolObj, otp);
  
  var maskedEmail = maskEmailAddress(email);
  return {
    status: "success",
    udiseNo: schoolObj.udiseNo,
    maskedEmail: maskedEmail,
    message: "OTP எண் உங்கள் பள்ளியின் பதிவு செய்யப்பட்ட மின்னஞ்சலுக்கு (" + maskedEmail + ") பாதுகாப்பாக அனுப்பப்பட்டுள்ளது."
  };
}

// =========================================================================
// 5. OTP சரிபார்த்து புதிய கடவுச்சொல் அமைத்தல் (Verify OTP & Reset Password)
// =========================================================================
function handleVerifyOtpAndReset(data) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.schoolSheet;
  var username = (data.username || "").toString().trim();
  var enteredOtp = (data.otp || "").toString().trim();
  var newPassword = (data.newPassword || "").toString().trim();
  
  if (!username || !enteredOtp) {
    return { status: "error", message: "UDISE மற்றும் OTP எண் இரண்டும் தேவை." };
  }
  if (!newPassword || newPassword.length < 4) {
    return { status: "error", message: "புதிய கடவுச்சொல் குறைந்தது 4 எழுத்துகளாக இருக்க வேண்டும்." };
  }
  
  var cleanU = username.replace(/^0+/, "");
  var rows = sheet.getDataRange().getValues();
  var targetRowIdx = -1;
  var schoolObj = null;
  var storedOtp = "";
  var otpTime = 0;
  
  for (var i = 1; i < rows.length; i++) {
    var rUdise = (rows[i][0] || "").toString().trim();
    var rUNo = (rows[i][1] || "").toString().trim();
    var cleanRUNo = rUNo.replace(/^0+/, "");
    
    if (rUdise === username || rUNo === username || cleanRUNo === cleanU) {
      targetRowIdx = i + 1;
      storedOtp = (rows[i][12] || "").toString().trim();
      otpTime = Number(rows[i][13]) || 0;
      schoolObj = {
        udiseNo: rUdise,
        uNo: rUNo,
        nameEn: rows[i][2],
        nameTa: rows[i][3],
        schoolEmail: rows[i][6],
        block: rows[i][4]
      };
      break;
    }
  }
  
  if (targetRowIdx === -1 || !schoolObj) {
    return { status: "error", message: "பள்ளி விவரங்கள் காணப்படவில்லை." };
  }
  
  // CacheService அல்லது Sheet OTP-ஐ சரிபார்த்தல்
  var cache = CacheService.getScriptCache();
  var cachedOtp = cache.get("OTP_" + schoolObj.udiseNo);
  
  var validOtp = (cachedOtp && cachedOtp === enteredOtp) || (storedOtp && storedOtp === enteredOtp);
  
  if (!validOtp) {
    return { status: "error", message: "தவறான OTP எண். மின்னஞ்சலைப் பார்த்து சரியான OTP-ஐ உள்ளிடவும்." };
  }
  
  // OTP காலாவதி நேரம் சரிபார்த்தல் (15 நிமிடங்கள்)
  var now = new Date().getTime();
  if (otpTime > 0 && (now - otpTime > 900000) && !cachedOtp) {
    return { status: "error", message: "OTP எண்ணின் கால அவகாசம் முடிந்துவிட்டது. மீண்டும் 'OTP அனுப்புக' கிளிக் செய்யவும்." };
  }
  
  // கடவுச்சொல்லைப் புதுப்பித்தல்
  var resetTimeStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  sheet.getRange(targetRowIdx, 10).setValue(newPassword);
  sheet.getRange(targetRowIdx, 12).setValue(resetTimeStr);
  sheet.getRange(targetRowIdx, 13).setValue(""); // Clear OTP
  cache.remove("OTP_" + schoolObj.udiseNo);
  
  // புதிய கடவுச்சொல் உறுதிப்படுத்தல் மின்னஞ்சல்
  sendCredentialsEmail(schoolObj, newPassword, true);
  
  return {
    status: "success",
    message: "கடவுச்சொல் வெற்றிகரமாக மீட்டமைக்கப்பட்டது! புதிய கடவுச்சொல்லுடன் உள்நுழையலாம்."
  };
}

// OTP மின்னஞ்சல் அனுப்புதல் (GmailApp & MailApp இரட்டை வசதி)
function sendOtpEmail(school, otp) {
  try {
    var email = (school.schoolEmail || "").toString().trim();
    if (!email || email.indexOf("@") === -1) {
      Logger.log("Invalid email address for OTP: " + email);
      return;
    }
    
    var schoolName = school.nameTa || school.nameEn || "பள்ளி";
    var subject = "SISF 2026 - கடவுச்சொல் மீட்டமைக்கும் OTP எண் (" + otp + ") - " + schoolName;
    
    var htmlBody = '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"></head>' +
      '<body style="font-family: Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px; color: #2d3748;">' +
      '<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 550px; background: #ffffff; border: 2px solid #dd6b20; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">' +
      '  <tr>' +
      '    <td style="background: linear-gradient(135deg, #c05621 0%, #dd6b20 100%); color: #ffffff; padding: 22px; text-align: center;">' +
      '      <div style="font-size: 13px; font-weight: bold; letter-spacing: 1px; color: #fef08a; text-transform: uppercase;">பள்ளிக்கல்வித்துறை – சிவகங்கை மாவட்டம்</div>' +
      '      <h2 style="margin: 6px 0 2px; font-size: 19px; font-weight: 800;">தென்னிந்திய அறிவியல் கண்காட்சி (SISF - 2026)</h2>' +
      '      <div style="font-size: 13px; opacity: 0.95;">கடவுச்சொல் மீட்டமைக்கும் OTP சரிபார்ப்பு</div>' +
      '    </td>' +
      '  </tr>' +
      '  <tr>' +
      '    <td style="padding: 24px 26px; text-align: center;">' +
      '      <p style="font-size: 15px; font-weight: bold; color: #1a365d; margin: 0 0 10px; text-align: left;">அன்பார்ந்த தலைமையாசிரியர் அவர்களுக்கு,</p>' +
      '      <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin: 0 0 18px; text-align: left;">' +
      '        தங்களின் பள்ளிக்கான (<strong>' + schoolName + '</strong>) இணைய முகப்பின் கடவுச்சொல்லை மீட்டமைக்கக் கோரப்பட்டுள்ளது. தங்களின் 6 இலக்க OTP சரிபார்ப்புக் குறியீடு கீழே கொடுக்கப்பட்டுள்ளது:' +
      '      </p>' +
      '      <div style="background: #fffaf0; border: 2px dashed #dd6b20; border-radius: 10px; padding: 18px; margin: 15px 0 20px; display: inline-block; min-width: 200px;">' +
      '        <div style="font-size: 12px; color: #718096; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">தங்களின் OTP எண்</div>' +
      '        <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #c05621;">' + otp + '</div>' +
      '      </div>' +
      '      <p style="font-size: 13px; color: #718096; line-height: 1.5; margin: 0 0 10px;">' +
      '        ⚠️ இந்தக் குறியீடு <strong>15 நிமிடங்களுக்கு மட்டுமே</strong> செல்லுபடியாகும். தாங்கள் கோரவில்லை எனில் இத்தகவலைப் புறக்கணிக்கலாம்.' +
      '      </p>' +
      '    </td>' +
      '  </tr>' +
      '</table>' +
      '</body></html>';
      
    var plainBody = "அன்பார்ந்த தலைமையாசிரியர் அவர்களுக்கு,\n\n" +
      "தங்களின் பள்ளிக்கு (" + schoolName + ") கடவுச்சொல் மீட்டமைக்கக் கோரப்பட்ட OTP எண்: " + otp + "\n\n" +
      "இந்தக் குறியீடு 15 நிமிடங்களுக்கு மட்டுமே செல்லுபடியாகும்.\n\n" +
      "நன்றி,\nபள்ளிக்கல்வித்துறை, சிவகங்கை மாவட்டம்.";
      
    try {
      GmailApp.sendEmail(email, subject, plainBody, {
        htmlBody: htmlBody,
        name: SENDER_DISPLAY_NAME
      });
      Logger.log("OTP Email sent via GmailApp to: " + email);
    } catch (gErr) {
      Logger.log("GmailApp send error, trying MailApp: " + gErr.toString());
      MailApp.sendEmail({
        to: email,
        name: SENDER_DISPLAY_NAME,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody
      });
      Logger.log("OTP Email sent via MailApp to: " + email);
    }
  } catch (e) {
    Logger.log("OTP send error: " + e.toString());
  }
}

// புதிய பள்ளிப் பதிவின்போது மின்னஞ்சல் முகவரியை உறுதிப்படுத்த OTP அனுப்புதல் (Registration Email OTP)
function handleSendRegOtp(data) {
  try {
    var rawEmail = (data.email || data.schoolEmail || "").toString().trim();
    var email = fixEmailTyposServer(rawEmail);
    if (!email || email.indexOf("@") === -1) {
      return { status: "error", message: "சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்." };
    }
    var clientOtp = (data.otp || "").toString().trim();
    var otp = (/^[0-9]{6}$/.test(clientOtp)) ? clientOtp : Math.floor(100000 + Math.random() * 900000).toString();
    var schoolName = (data.schoolName || "பள்ளி").toString().trim();
    var uNo = (data.uNo || "-").toString().trim();
    var udiseNo = (data.udiseNo || "-").toString().trim();

    var cache = CacheService.getScriptCache();
    cache.put("REG_OTP_" + email, otp, 900);

    var subject = "SISF 2026 - புதிய பள்ளிப் பதிவு மின்னஞ்சல் சரிபார்ப்பு OTP (" + otp + ") - " + schoolName;
    var htmlBody = '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"></head>' +
      '<body style="font-family: Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px; color: #2d3748;">' +
      '<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background: #ffffff; border: 2px solid #2b6cb0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">' +
      '  <tr>' +
      '    <td style="background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); color: #ffffff; padding: 22px; text-align: center;">' +
      '      <div style="font-size: 13px; font-weight: bold; letter-spacing: 1px; color: #fef08a; text-transform: uppercase;">SIVAGANGAI DISTRICT SCHOOL EDUCATION DEPARTMENT</div>' +
      '      <h2 style="margin: 6px 0 2px; font-size: 18px; font-weight: 800;">தென்னிந்திய அறிவியல் கண்காட்சி (SISF - 2026)</h2>' +
      '      <div style="font-size: 13px; opacity: 0.95;">புதிய பள்ளிப் பதிவு – மின்னஞ்சல் முகவரி சரிபார்ப்பு OTP</div>' +
      '    </td>' +
      '  </tr>' +
      '  <tr>' +
      '    <td style="padding: 24px 26px; text-align: center;">' +
      '      <p style="font-size: 15px; font-weight: bold; color: #1a365d; margin: 0 0 10px; text-align: left;">அன்பார்ந்த தலைமையாசிரியர் அவர்களுக்கு,</p>' +
      '      <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin: 0 0 16px; text-align: left;">' +
      '        தங்களின் பள்ளி (<strong>' + schoolName + '</strong> | U.NO: ' + uNo + ' | UDISE: ' + udiseNo + ') தென்னிந்திய அறிவியல் கண்காட்சி இணைய முகப்பில் புதிய கணக்குத் தொடங்குவதற்கான <strong>6 இலக்க மின்னஞ்சல் சரிபார்ப்பு OTP</strong> கீழே கொடுக்கப்பட்டுள்ளது:' +
      '      </p>' +
      '      <div style="background: #ebf8ff; border: 2px dashed #2b6cb0; border-radius: 10px; padding: 16px; margin: 12px 0 18px; display: inline-block; min-width: 200px;">' +
      '        <div style="font-size: 12px; color: #2c5282; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">மின்னஞ்சல் சரிபார்ப்பு OTP</div>' +
      '        <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #1a365d;">' + otp + '</div>' +
      '      </div>' +
      '      <p style="font-size: 13px; color: #718096; line-height: 1.5; margin: 0;">' +
      '        இக்குறியீட்டைப் பதிவுப் பக்கத்தில் உள்ளிட்டு தங்களின் பள்ளியின் மின்னஞ்சல் முகவரியை உறுதிப்படுத்தவும்.' +
      '      </p>' +
      '    </td>' +
      '  </tr>' +
      '</table>' +
      '</body></html>';

    var plainBody = "SIVAGANGAI DISTRICT SCHOOL EDUCATION DEPARTMENT\n\n" +
      "பள்ளி: " + schoolName + " (U.NO: " + uNo + " | UDISE: " + udiseNo + ")\n" +
      "புதிய பள்ளிப் பதிவு மின்னஞ்சல் சரிபார்ப்பு OTP எண்: " + otp + "\n\n" +
      "நன்றி,\nபள்ளிக்கல்வித்துறை, சிவகங்கை மாவட்டம்.";

    try {
      GmailApp.sendEmail(email, subject, plainBody, {
        htmlBody: htmlBody,
        name: SENDER_DISPLAY_NAME
      });
    } catch (gErr) {
      MailApp.sendEmail({
        to: email,
        name: SENDER_DISPLAY_NAME,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody
      });
    }

    return {
      status: "success",
      email: email,
      message: "மின்னஞ்சல் சரிபார்ப்பு OTP வெற்றிகரமாக அனுப்பப்பட்டது."
    };
  } catch (err) {
    return { status: "error", message: err.toString() };
  }
}

function fixEmailTyposServer(rawEmail) {
  if (!rawEmail) return "";
  var e = rawEmail.toString().trim().toLowerCase();
  e = e.replace(/@(gmai|gmial|gamil|gmal|gmaiil)\.com$/i, "@gmail.com");
  e = e.replace(/@gmail\.(co|cm|con|om)$/i, "@gmail.com");
  return e;
}

function maskEmailAddress(email) {
  try {
    var parts = email.split("@");
    var name = parts[0];
    var domain = parts[1];
    var maskedName = name.length > 3 ? (name.substring(0, 2) + "****" + name.slice(-1)) : (name.substring(0, 1) + "***");
    return maskedName + "@" + domain;
  } catch (e) {
    return email;
  }
}

function sendCredentialsEmail(school, password, isReset) {
  try {
    var email = (school.schoolEmail || "").toString().trim();
    if (!email || email.indexOf("@") === -1) return { sent: false };
    
    var schoolName = school.nameTa || school.nameEn || school.schoolAddress || "பள்ளி";
    var subject = isReset 
      ? "SISF 2026 - கடவுச்சொல் மாற்றப்பட்டது (Password Changed) - " + schoolName
      : "SISF 2026 - பள்ளிப் பதிவு & உள்நுழைவு விவரங்கள் (Login Credentials) - " + schoolName;
    
    var actionTitle = isReset ? "கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது" : "பள்ளிப் பதிவு வெற்றிகரமானது";
    var introMsg = isReset 
      ? "தங்களின் பள்ளிக்கான இணைய முகப்பின் கடவுச்சொல் OTP மூலம் வெற்றிகரமாக மாற்றப்பட்டுள்ளது. தங்களின் புதிய உள்நுழைவு விவரங்கள்:"
      : "தென்னிந்திய அறிவியல் கண்காட்சி (SISF - 2026) போட்டிக்கான தங்களின் பள்ளிப் பதிவு வெற்றிகரமாக முடிந்தது. உள்நுழைவு விவரங்கள்:";
    
    var htmlBody = '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"></head>' +
      '<body style="font-family: Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px; color: #2d3748;">' +
      '<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background: #ffffff; border: 2px solid #2b6cb0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">' +
      '  <tr>' +
      '    <td style="background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); color: #ffffff; padding: 22px; text-align: center;">' +
      '      <div style="font-size: 13px; font-weight: bold; letter-spacing: 1px; color: #fef08a; text-transform: uppercase;">பள்ளிக்கல்வித்துறை – சிவகங்கை மாவட்டம்</div>' +
      '      <h2 style="margin: 6px 0 2px; font-size: 19px; font-weight: 800;">தென்னிந்திய அறிவியல் கண்காட்சி (SISF - 2026)</h2>' +
      '      <div style="font-size: 13px; opacity: 0.95;">' + actionTitle + '</div>' +
      '    </td>' +
      '  </tr>' +
      '  <tr>' +
      '    <td style="padding: 24px 26px;">' +
      '      <p style="font-size: 15px; font-weight: bold; color: #1a365d; margin: 0 0 10px;">அன்பார்ந்த தலைமையாசிரியர் அவர்களுக்கு,</p>' +
      '      <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin: 0 0 18px;">' + introMsg + '</p>' +
      '      <div style="background: #f8fafc; border: 1.5px solid #cbd5e0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">' +
      '        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">' +
      '          <tr><td style="padding: 6px 0; color: #718096; width: 40%; font-weight: bold;">பள்ளியின் பெயர்:</td><td style="padding: 6px 0; font-weight: bold; color: #1a365d;">' + schoolName + '</td></tr>' +
      '          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">U.NO:</td><td style="padding: 6px 0; font-weight: 800; font-size: 16px; color: #c05621;">' + (school.uNo || "-") + '</td></tr>' +
      '          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">UDISE எண்:</td><td style="padding: 6px 0; font-weight: 800; font-size: 16px; color: #2b6cb0;">' + (school.udiseNo || "-") + '</td></tr>' +
      '          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">கடவுச்சொல்:</td><td style="padding: 6px 0; font-weight: 800; font-size: 18px; color: #e53e3e; background: #fff5f5; display: inline-block; padding: 4px 10px; border-radius: 4px; border: 1px dashed #feb2b2;">' + password + '</td></tr>' +
      '        </table>' +
      '      </div>' +
      '      <p style="font-size: 13px; line-height: 1.6; color: #4a5568;">' +
      '        இக்கடவுச்சொல்லைப் பயன்படுத்திப் பள்ளி முகப்பில் உள்நுழைந்து, தங்களின் 3 போட்டிப் பிரிவு விண்ணப்பங்களைச் சமர்ப்பிக்கலாம் / திருத்தலாம்.' +
      '      </p>' +
      '    </td>' +
      '  </tr>' +
      '</table>' +
      '</body></html>';
      
    var plainBody = "அன்பார்ந்த தலைமையாசிரியர் அவர்களுக்கு,\n\n" + introMsg + "\n\n" +
      "• பள்ளியின் பெயர்: " + schoolName + "\n" +
      "• U.NO: " + (school.uNo || "-") + "\n" +
      "• UDISE எண்: " + (school.udiseNo || "-") + "\n" +
      "• கடவுச்சொல்: " + password + "\n\n" +
      "நன்றி,\nபள்ளிக்கல்வித்துறை, சிவகங்கை மாவட்டம்.";
      
    try {
      GmailApp.sendEmail(email, subject, plainBody, {
        htmlBody: htmlBody,
        name: SENDER_DISPLAY_NAME
      });
    } catch (gErr) {
      MailApp.sendEmail({
        to: email,
        name: SENDER_DISPLAY_NAME,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody
      });
    }
    return { sent: true };
  } catch (e) {
    return { sent: false };
  }
}

// உள்நுழைவு
function handleLogin(username, password) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.schoolSheet;
  var u = (username || "").toString().trim();
  var p = (password || "").toString().trim();
  var cleanU = u.replace(/^0+/, "");
  
  var rows = sheet.getDataRange().getValues();
  var foundSchool = null;
  
  for (var i = 1; i < rows.length; i++) {
    var rUdise = (rows[i][0] || "").toString().trim();
    var rUNo = (rows[i][1] || "").toString().trim();
    var cleanRUNo = rUNo.replace(/^0+/, "");
    
    var matchUser = (rUdise === u || rUNo === u || cleanRUNo === cleanU);
    
    if (matchUser) {
      if (rows[i][9].toString().trim() === p) {
        foundSchool = {
          udiseNo: rUdise,
          uNo: rUNo,
          schoolAddress: (rows[i][3] || rows[i][2] || "") + (rows[i][4] ? " (" + rows[i][4] + ")" : ""),
          nameTa: rows[i][3],
          nameEn: rows[i][2],
          block: rows[i][4],
          schoolContact: rows[i][5],
          schoolEmail: rows[i][6],
          schoolManagement: rows[i][7],
          hmName: rows[i][8]
        };
        break;
      } else {
        return { status: "error", message: "கடவுச்சொல் தவறானது (Incorrect password)." };
      }
    }
  }
  
  if (!foundSchool) {
    return { 
      status: "error", 
      message: "இந்த UDISE / U.NO எண் (" + u + ") பதிவு செய்யப்படவில்லை. முதலில் 'புதிய பள்ளிப் பதிவு' செய்யவும்." 
    };
  }
  
  var apps = getApplicationsForSchool(foundSchool.udiseNo);
  
  return {
    status: "success",
    message: "வெற்றிகரமாக உள்நுழைந்தது!",
    school: foundSchool,
    applications: apps
  };
}

function handleGetSchoolData(udise) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.schoolSheet;
  var u = (udise || "").toString().trim();
  var cleanU = u.replace(/^0+/, "");
  var rows = sheet.getDataRange().getValues();
  var foundSchool = null;
  
  for (var i = 1; i < rows.length; i++) {
    var rUdise = (rows[i][0] || "").toString().trim();
    var rUNo = (rows[i][1] || "").toString().trim();
    var cleanRUNo = rUNo.replace(/^0+/, "");
    if (rUdise === u || rUNo === u || (cleanU && cleanRUNo === cleanU)) {
      foundSchool = {
        udiseNo: rUdise,
        uNo: rUNo,
        schoolAddress: (rows[i][3] || rows[i][2] || ""),
        nameTa: rows[i][3],
        nameEn: rows[i][2],
        block: rows[i][4],
        schoolContact: rows[i][5],
        schoolEmail: rows[i][6],
        schoolManagement: rows[i][7],
        hmName: rows[i][8]
      };
      break;
    }
  }
  
  var apps = getApplicationsForSchool(foundSchool ? foundSchool.udiseNo : u);
  return { status: "success", school: foundSchool, applications: apps };
}

function getApplicationsForSchool(udise) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.appSheet;
  var rows = sheet.getDataRange().getValues();
  
  var apps = {
    Individual: null,
    Group: null,
    Teacher: null
  };
  
  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    var rUdise = (r[2] || "").toString().trim();
    var rCategory = (r[9] || "").toString().trim();
    
    var rUNo = (r[3] || "").toString().trim();
    var matchSchool = (rUdise === udise || rUNo === udise || (udise && udise.replace(/^0+/, "") === rUNo.replace(/^0+/, "")));
    if (matchSchool) {
      if (rCategory === "Individual" && !apps.Individual) {
        apps.Individual = rowToAppObject(r, i + 1);
      } else if (rCategory === "Group" && !apps.Group) {
        apps.Group = rowToAppObject(r, i + 1);
      } else if (rCategory === "Teacher" && !apps.Teacher) {
        apps.Teacher = rowToAppObject(r, i + 1);
      }
    }
  }
  return apps;
}

function rowToAppObject(r, rowIdx) {
  return {
    rowIndex: rowIdx,
    timestamp: r[0],
    regNo: r[1],
    udiseNo: r[2],
    uNo: r[3],
    schoolAddress: r[4],
    pinCode: r[5],
    schoolContact: r[6],
    schoolEmail: r[7],
    schoolManagement: r[8],
    categoryOfEntry: r[9],
    student1Name: r[10],
    student1Class: r[11],
    student1Sex: r[12],
    student2Name: r[13],
    student2Class: r[14],
    student2Sex: r[15],
    guideTeacherName: r[16],
    guideTeacherDesig: r[17],
    guideTeacherMobile: r[18],
    guideTeacherEmail: r[19],
    exhibitDiscipline: r[20],
    exhibitTitle: r[21],
    natureOfModel: r[22],
    stallRequirements: (r[23] || "").toString().split(", ").filter(Boolean),
    briefConcept: r[24],
    declaration: true
  };
}

function handleSaveApplication(data) {
  var deadlineMs = new Date("2026-10-30T23:59:59+05:30").getTime();
  if (new Date().getTime() > deadlineMs) {
    return {
      status: "error",
      message: "விண்ணப்பிக்கும் மற்றும் திருத்தம் செய்யும் கடைசி நாள் (30.10.2026) முடிவடைந்துவிட்டது. PDF பதிவிறக்கம் மட்டுமே செய்ய இயலும்."
    };
  }
  var sheets = getOrCreateSheets();
  var sheet = sheets.appSheet;
  var udise = (data.udiseNo || "").toString().trim();
  var category = (data.categoryOfEntry || "").toString().trim();
  var regNumber = (data.regNo || "").toString().trim();
  
  if (!udise || udise.length !== 11) {
    return { status: "error", message: "செல்லுபடியாகும் UDISE எண் தேவை." };
  }
  if (!category || (category !== "Individual" && category !== "Group" && category !== "Teacher")) {
    return { status: "error", message: "செல்லுபடியாகும் போட்டிப் பிரிவைத் தேர்வு செய்யவும்." };
  }
  
  var currentApps = getApplicationsForSchool(udise);
  var existingSlot = currentApps[category];
  
  var isUpdate = false;
  var targetRowIdx = -1;
  
  if (existingSlot) {
    isUpdate = true;
    targetRowIdx = existingSlot.rowIndex;
    if (!regNumber) {
      regNumber = existingSlot.regNo;
    }
  } else {
    isUpdate = false;
    if (!regNumber) {
      regNumber = "SISF-" + ("000" + sheet.getLastRow()).slice(-4);
    }
  }
  
  var stallReqStr = "";
  if (Array.isArray(data.stallRequirements)) {
    stallReqStr = data.stallRequirements.join(", ");
  } else if (data.stallRequirements) {
    stallReqStr = data.stallRequirements;
  }
  
  var timestampStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  if (isUpdate) {
    timestampStr += " (திருத்தப்பட்டது / Updated)";
  }
  
  var rowValues = [
    timestampStr,
    regNumber,
    udise,
    data.uNo || "",
    data.schoolAddress || "",
    data.pinCode || "",
    data.schoolContact || "",
    data.schoolEmail || "",
    data.schoolManagement || "",
    category,
    data.student1Name || "",
    data.student1Class || "",
    data.student1Sex || "",
    data.student2Name || "",
    data.student2Class || "",
    data.student2Sex || "",
    data.guideTeacherName || "",
    data.guideTeacherDesig || "",
    data.guideTeacherMobile || "",
    data.guideTeacherEmail || "",
    data.exhibitDiscipline || "",
    data.exhibitTitle || "",
    data.natureOfModel || "",
    stallReqStr,
    data.briefConcept || "",
    data.declaration ? "ஒப்புக்கொள்ளப்பட்டது (Accepted)" : "No"
  ];
  
  if (isUpdate && targetRowIdx > 1) {
    sheet.getRange(targetRowIdx, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  
  data.regNo = regNumber;
  data.stallReqStr = stallReqStr;
  
  var emailStatus = sendRegistrationPdfEmail(data, isUpdate);
  var updatedApps = getApplicationsForSchool(udise);
  
  return {
    status: "success",
    isUpdate: isUpdate,
    regNo: regNumber,
    category: category,
    emailSent: emailStatus.sent,
    emailRecipient: emailStatus.recipient,
    applications: updatedApps,
    message: isUpdate 
      ? category + " பிரிவு விண்ணப்பம் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது! புதுப்பிக்கப்பட்ட PDF மின்னஞ்சலுக்கு அனுப்பப்பட்டது." 
      : category + " பிரிவு விண்ணப்பம் வெற்றிகரமாகச் சமர்ப்பிக்கப்பட்டது! PDF பள்ளியின் மின்னஞ்சலுக்கு அனுப்பப்பட்டது."
  };
}

function sendRegistrationPdfEmail(data, isUpdate) {
  try {
    var schoolEmail = (data.schoolEmail || "").trim();
    var guideEmail = (data.guideTeacherEmail || "").trim();
    
    var recipientList = [];
    if (schoolEmail && schoolEmail.indexOf("@") !== -1) recipientList.push(schoolEmail);
    if (guideEmail && guideEmail.indexOf("@") !== -1 && recipientList.indexOf(guideEmail) === -1) recipientList.push(guideEmail);
    
    if (recipientList.length === 0) {
      return { sent: false, reason: "மின்னஞ்சல் முகவரி இல்லை" };
    }
    var targetEmail = recipientList.join(", ");
    
    var regNumber = data.regNo || "SISF-2026";
    var actionPrefix = isUpdate ? "[திருத்தப்பட்ட பதிவு / Updated] " : "";
    var subject = actionPrefix + "SISF 2026 அறிவியல் கண்காட்சி பதிவுப் படிவம் (" + data.categoryOfEntry + " - " + regNumber + ") - சிவகங்கை மாவட்டம்";
    
    var pdfBlob;
    if (data.pdfBase64 && data.pdfBase64.toString().length > 500) {
      try {
        var cleanB64 = data.pdfBase64.toString().replace(/^data:application\/pdf;base64,/, "").trim();
        var decodedBytes = Utilities.base64Decode(cleanB64);
        pdfBlob = Utilities.newBlob(decodedBytes, "application/pdf", regNumber + "_Registration_Form.pdf");
      } catch (decodeErr) {
        Logger.log("pdfBase64 decode notice: " + decodeErr.toString());
      }
    }
    if (!pdfBlob) {
      var pdfHtml = buildPdfHtml(data);
      pdfBlob = Utilities.newBlob(pdfHtml, "text/html", regNumber + "_Registration_Form.html").getAs("application/pdf");
      pdfBlob.setName(regNumber + "_Registration_Form.pdf");
    }
    
    var emailBodyText = "அன்பார்ந்த தலைமையாசிரியர் / வழிகாட்டி ஆசிரியர் அவர்களுக்கு,\n\n" +
      "தென்னிந்திய அறிவியல் கண்காட்சி (SISF 2026) மாவட்ட அளவிலான போட்டிக்கான தங்களின் பள்ளிப் பதிவு " + 
      (isUpdate ? "வெற்றிகரமாகப் புதுப்பிக்கப்பட்டுள்ளது." : "வெற்றிகரமாகப் பெறப்பட்டுள்ளது.") + "\n\n" +
      "• போட்டிப் பிரிவு (Category): " + (data.categoryOfEntry || "-") + "\n" +
      "• பதிவு எண் (Reg. No): " + regNumber + "\n" +
      "• U.NO: " + (data.uNo || "-") + "\n" +
      "• UDISE எண்: " + (data.udiseNo || "-") + "\n" +
      "• பள்ளியின் பெயர்: " + (data.schoolAddress || "-") + "\n" +
      "• படைப்பின் தலைப்பு: " + (data.exhibitTitle || "-") + "\n" +
      "• வழிகாட்டி ஆசிரியர்: " + (data.guideTeacherName || "-") + "\n\n" +
      "பூர்த்தி செய்யப்பட்ட அதிகாரப்பூர்வ பதிவுப் படிவம் இத்துடன் PDF கோப்பாக இணைக்கப்பட்டுள்ளது. " +
      "இதனை அச்சிட்டு தலைமையாசிரியர் முத்திரை மற்றும் கையொப்பத்துடன் மாவட்டக் கண்காட்சியில் சமர்ப்பிக்கவும்.\n\n" +
      "நன்றி,\n" +
      "பள்ளிக்கல்வித்துறை, சிவகங்கை மாவட்டம்.";
    
    var ccAddress = (guideEmail && guideEmail.indexOf("@") !== -1 && guideEmail !== targetEmail) ? guideEmail : "";
    
    try {
      var gmailOpts = {
        name: SENDER_DISPLAY_NAME,
        attachments: [pdfBlob]
      };
      if (ccAddress) gmailOpts.cc = ccAddress;
      GmailApp.sendEmail(targetEmail, subject, emailBodyText, gmailOpts);
    } catch (gErr) {
      MailApp.sendEmail({
        to: targetEmail,
        cc: ccAddress,
        name: SENDER_DISPLAY_NAME,
        subject: subject,
        body: emailBodyText,
        attachments: [pdfBlob]
      });
    }
    
    return { sent: true, recipient: targetEmail };
  } catch (err) {
    Logger.log("Email error: " + err.toString());
    return { sent: false, error: err.toString() };
  }
}

function buildPdfHtml(data) {
  var sreqs = Array.isArray(data.stallRequirements) ? data.stallRequirements : (data.stallRequirements || "").split(", ");
  var cat = (data.categoryOfEntry || "").toString().trim();
  var catFull = (cat === "Group") ? "குழு வகை (Group - 2 Students + 1 Guide Teacher)" : ((cat === "Teacher") ? "ஆசிரியர் வகை (Teacher - 1 Teacher Only)" : "தனிநபர் வகை (Individual - 1 Student + 1 Guide Teacher)");
  var nat = (data.natureOfModel || "").toString().trim();
  var natDisplay = (nat === "Working Model") ? "இயங்கும் மாதிரி (Working Model)" : "நிலையான மாதிரி (Static Model)";
  var stallStr = sreqs.length ? sreqs.join(", ") : "ஏதுமில்லை (None)";
  var briefConcept = (data.briefConcept || "").toString().trim();
  var taConcept = (data.briefConceptTa || "").toString().trim();
  var enConcept = (data.briefConceptEn || "").toString().trim();
  if ((!taConcept || !enConcept) && briefConcept) {
    if (briefConcept.indexOf("[English Abstract]:") !== -1) {
      var parts = briefConcept.split(/\[English Abstract\]:/i);
      if (!taConcept) taConcept = parts[0].trim();
      if (!enConcept) enConcept = parts[1].trim();
    } else if (!taConcept) {
      taConcept = briefConcept;
    }
  }

  var tnLogoSrc = 'data:image/png;base64,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';

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>' +
    '@page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }' +
    'body { font-family: "Noto Sans Tamil", Arial, sans-serif; font-size: 9.5pt; color: #111; margin: 0; padding: 0; line-height: 1.45; }' +
    '.page-box { border: 2px solid #000; padding: 12px 14px; min-height: 258mm; box-sizing: border-box; position: relative; }' +
    '.top-header { display: table; width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }' +
    '.th-left { display: table-cell; width: 75px; vertical-align: middle; text-align: left; }' +
    '.th-center { display: table-cell; vertical-align: middle; text-align: center; }' +
    '.th-right { display: table-cell; width: 90px; vertical-align: top; text-align: right; }' +
    '.dno-box { border: 1.5px solid #000; background: #f8fafc; padding: 4px; text-align: center; width: 85px; }' +
    '.dept-ta { font-size: 12pt; font-weight: bold; color: #000; }' +
    '.dept-en { font-size: 8.5pt; font-weight: bold; color: #2d3748; }' +
    '.title-ta { font-size: 11pt; font-weight: bold; color: #1a365d; margin-top: 2px; }' +
    '.title-en { font-size: 8.5pt; font-weight: bold; color: #c53030; }' +
    '.meta-table { width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000; margin-bottom: 8px; padding-bottom: 4px; }' +
    '.grid-table { width: 100%; border-collapse: collapse; border: 1.5px solid #4a5568; margin-bottom: 8px; }' +
    '.grid-table td { border: 1px solid #cbd5e0; padding: 4px 8px; vertical-align: top; font-size: 9pt; }' +
    '.grid-label { background: #f8fafc; width: 34%; font-weight: bold; color: #1a202c; border-right: 1.5px solid #4a5568 !important; }' +
    '.concept-card { border: 1.5px solid #cbd5e0; background: #f8fafc; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; }' +
    '.decl-box { border: 1.5px solid #4a5568; background: #fafafa; border-radius: 4px; padding: 6px 10px; text-align: center; font-size: 8.5pt; margin-bottom: 8px; }' +
    '.sigs-table { width: 100%; border-collapse: collapse; text-align: center; margin-top: 18px; margin-bottom: 10px; }' +
    '.sigs-table td { vertical-align: top; font-size: 8.5pt; font-weight: bold; }' +
    '.note-box { background: #fffbeb; border: 1.5px solid #d97706; border-radius: 4px; padding: 6px 10px; text-align: center; color: #92400e; font-size: 8.5pt; margin-top: 8px; }' +
    '.page-break { page-break-before: always; }' +
    '</style></head><body>' +

    // PAGE 1: REGISTRATION DETAILS
    '<div class="page-box">' +
    '  <div class="top-header">' +
    '    <div class="th-left"><img src="' + tnLogoSrc + '" style="width:68px; height:auto;"></div>' +
    '    <div class="th-center">' +
    '      <div class="dept-ta">பள்ளிக்கல்வித்துறை – சிவகங்கை மாவட்டம்</div>' +
    '      <div class="dept-en">DEPARTMENT OF SCHOOL EDUCATION – SIVAGANGAI DISTRICT</div>' +
    '      <div class="title-ta">தென்னிந்திய அறிவியல் கண்காட்சி (SISF 2026) – பதிவுப் படிவம்</div>' +
    '      <div class="title-en">SOUTHERN INDIA SCIENCE FAIR – DISTRICT REGISTRATION FORM</div>' +
    '    </div>' +
    '    <div class="th-right">' +
    '      <div class="dno-box"><div style="font-weight:bold; font-size:11pt;">D.NO</div><div style="font-size:7pt; color:#555;">(Office use)</div><div style="height:25px; border:1px dashed #aaa; margin-top:2px;"></div></div>' +
    '    </div>' +
    '  </div>' +

    '  <table class="meta-table">' +
    '    <tr>' +
    '      <td style="width:42%;"><strong>UDISE NO:</strong> ' + (data.udiseNo || "-") + '</td>' +
    '      <td style="width:36%; text-align:center;"><strong>பதிவு எண் / Reg. No:</strong> <span style="font-size:11pt; font-weight:bold; color:#1a365d;">' + (data.regNo || "-") + '</span></td>' +
    '      <td style="width:22%; text-align:right;"><strong>U.NO:</strong> ' + (data.uNo || "-") + '</td>' +
    '    </tr>' +
    '  </table>' +

    '  <table class="grid-table">' +
    '    <tr><td class="grid-label">1. பள்ளியின் பெயர் & முகவரி / School:</td><td><strong>' + (data.schoolAddress || "-") + '</strong><br>PIN: ' + (data.pinCode || "-") + ' | தொடர்புக்கு: ' + (data.schoolContact || "-") + ' | Email: ' + (data.schoolEmail || "-") + '</td></tr>' +
    '    <tr><td class="grid-label">2. பள்ளி வகை / Management:</td><td>' + (data.schoolManagement || "-") + '</td></tr>' +
    '    <tr><td class="grid-label">3. போட்டிப் பிரிவு / Category:</td><td><strong>' + catFull + '</strong></td></tr>' +
    '    <tr><td class="grid-label">4. பங்கேற்பாளர் விவரங்கள் / Participants:</td><td>' +
    '      <div><strong>மாணவர் 1:</strong> ' + (data.student1Name || "-") + ' | வகுப்பு: ' + (data.student1Class || "-") + ' | பால்: ' + (data.student1Sex || "-") + '</div>' +
    (cat === "Group" ? '      <div><strong>மாணவர் 2:</strong> ' + (data.student2Name || "-") + ' | வகுப்பு: ' + (data.student2Class || "-") + ' | பால்: ' + (data.student2Sex || "-") + '</div>' : '') +
    '      <div><strong>வழிகாட்டி ஆசிரியர்:</strong> ' + (data.guideTeacherName || "-") + ' | பதவி: ' + (data.guideTeacherDesig || "-") + ' | கைபேசி: ' + (data.guideTeacherMobile || "-") + ' | Email: ' + (data.guideTeacherEmail || "-") + '</div>' +
    '    </td></tr>' +
    '    <tr><td class="grid-label">5. கண்காட்சித் துறை / Discipline:</td><td>' + (data.exhibitDiscipline || "-") + '</td></tr>' +
    '    <tr><td class="grid-label">6. படைப்பின் தலைப்பு / Title:</td><td><strong style="color:#9c4221;">' + (data.exhibitTitle || "-") + '</strong></td></tr>' +
    '    <tr><td class="grid-label">7. மாதிரியின் வகை / Model:</td><td>' + natDisplay + '</td></tr>' +
    '    <tr><td class="grid-label">8. அரங்கத் தேவைகள் / Stalls:</td><td>' + stallStr + '</td></tr>' +
    '  </table>' +

    '  <div class="concept-card">' +
    '    <div style="font-weight:bold; color:#1a365d; font-size:9.5pt; margin-bottom:4px;">9. அறிவியல் படைப்பின் சுருக்கக் குறிப்புரை / Concept & Abstract Summary:</div>' +
    (taConcept ? '<div style="margin-bottom:4px;"><strong>தமிழ்:</strong> ' + taConcept + '</div>' : '') +
    (enConcept ? '<div><strong>English:</strong> ' + enConcept + '</div>' : (!taConcept ? '<div>விவரங்கள் ஏதுமில்லை</div>' : '')) +
    '  </div>' +

    '  <div class="decl-box">' +
    '    <div style="font-weight:bold; color:#1a365d; margin-bottom:2px;">உறுதிமொழி / Declaration</div>' +
    '    <div>மேற்குறிப்பிட்ட விவரங்கள் உண்மை எனவும், இப்படைப்பு வழிகாட்டி ஆசிரியரின் ஆலோசனையுடன் மாணவர்களின் சுய முயற்சியால் உருவானது எனவும் உறுதியளிக்கிறோம். / We declare that the furnished details are true and prepared under teacher guidance.</div>' +
    '  </div>' +

    '  <table class="sigs-table">' +
    '    <tr>' +
    '      <td style="width:33%;">பங்கேற்பாளர் கையொப்பம்<br><span style="font-size:7.5pt; font-weight:normal; color:#555;">Signature of Participant</span><br><span style="color:#1a365d;">( ' + (data.student1Name || "மாணவர்") + ' )</span></td>' +
    '      <td style="width:33%;">வழிகாட்டி ஆசிரியர் கையொப்பம்<br><span style="font-size:7.5pt; font-weight:normal; color:#555;">Signature of Guide Teacher</span><br><span style="color:#1a365d;">( ' + (data.guideTeacherName || "வழிகாட்டி ஆசிரியர்") + ' )</span></td>' +
    '      <td style="width:34%;">தலைமையாசிரியர் முத்திரை & கையொப்பம்<br><span style="font-size:7.5pt; font-weight:normal; color:#555;">Headmaster Seal & Signature</span><br><span style="color:#4a5568;">( தலைமையாசிரியர் )</span></td>' +
    '    </tr>' +
    '  </table>' +

    '  <div class="note-box">' +
    '    <div style="font-weight:bold; font-size:9pt;">📌 குறிப்பு: கண்காட்சியில் கலந்து கொள்ள வரும்போது பதிவிறக்கம் செய்யப்பட்ட படிவத்தினை இரண்டு பிரதிகளில் தலைமையாசிரியரின் ஒப்பத்துடன் பெற்று சமர்ப்பிக்க வேண்டும்.</div>' +
    '    <div style="font-size:7.8pt; color:#78350f; margin-top:2px;">Note: While attending the science fair, two hard copies of this downloaded registration form duly signed by the Headmaster/Principal must be submitted.</div>' +
    '  </div>' +
    '</div>' +

    // PAGE 2: DETAILED ABSTRACT & EXHIBIT SPECIFICATIONS
    '<div class="page-break"></div>' +
    '<div class="page-box">' +
    '  <div class="top-header">' +
    '    <div class="th-left"><img src="' + tnLogoSrc + '" style="width:68px; height:auto;"></div>' +
    '    <div class="th-center">' +
    '      <div class="dept-ta">பள்ளிக்கல்வித்துறை – சிவகங்கை மாவட்டம்</div>' +
    '      <div class="dept-en">DEPARTMENT OF SCHOOL EDUCATION – SIVAGANGAI DISTRICT</div>' +
    '      <div class="title-ta">தென்னிந்திய அறிவியல் கண்காட்சி (SISF 2026) – அறிவியல் படைப்பு விவரக் குறிப்புரை</div>' +
    '      <div class="title-en">SOUTHERN INDIA SCIENCE FAIR – EXHIBIT ABSTRACT & DETAILS SHEET</div>' +
    '      <div style="font-size:9pt; font-weight:bold; color:#2b6cb0; margin-top:2px;">பக்கம் 2: அறிவியல் படைப்பின் விரிவான குறிப்புரை</div>' +
    '    </div>' +
    '    <div class="th-right">' +
    '      <div class="dno-box"><div style="font-weight:bold; font-size:11pt; color:#c05621;">D.NO</div><div style="font-size:7pt; color:#555;">(Office use)</div><div style="height:25px; border:1px dashed #dd6b20; margin-top:2px;"></div></div>' +
    '    </div>' +
    '  </div>' +

    '  <div style="background:#ebf8ff; border:1px solid #3182ce; padding:6px 10px; margin-bottom:6px; font-weight:bold;">1. போட்டிப்பிரிவின் வகை / Category: <span style="color:#2b6cb0;">' + catFull + '</span></div>' +
    '  <div style="background:#f0fff4; border:1px solid #38a169; padding:6px 10px; margin-bottom:6px; font-weight:bold;">2. கண்காட்சித் துறை / Discipline: <span style="color:#22543d;">' + (data.exhibitDiscipline || "-") + '</span></div>' +
    '  <div style="background:#f7fafc; border:1px solid #4a5568; padding:6px 10px; margin-bottom:6px; font-weight:bold;">3. மாதிரியின் வகை / Nature of Model: <span style="color:#1a365d;">' + natDisplay + '</span></div>' +
    '  <div style="background:#edf2f7; border:1px solid #718096; padding:6px 10px; margin-bottom:6px; font-weight:bold;">4. கூடுதல் அரங்கத் தேவைகள் / Stall Requirements: <span style="color:#2b6cb0;">' + stallStr + '</span></div>' +
    '  <div style="background:#fffaf0; border:1px solid #dd6b20; padding:6px 10px; margin-bottom:10px; font-weight:bold;">5. அறிவியல் படைப்பின் தலைப்பு / Title of Exhibit: <span style="color:#9c4221;">' + (data.exhibitTitle || "-") + '</span></div>' +

    '  <div style="border:1.5px solid #000; min-height:160mm; padding:10px;">' +
    '    <div style="background:#1a365d; color:#fff; padding:5px 8px; font-weight:bold; font-size:10pt; margin-bottom:12px;">6. அறிவியல் படைப்பைப் பற்றிய விரிவான குறிப்புரை / Concept & Abstract (இருமொழிகளிலும்):</div>' +
    (taConcept ? '<div style="margin-bottom:16px;"><div style="font-weight:bold; color:#1a365d; font-size:10.5pt; margin-bottom:4px;">◆ தமிழ் சுருக்கம் / Tamil Concept:</div><div style="text-indent:20px; line-height:1.65; font-size:10pt;">' + taConcept + '</div></div>' : '') +
    (enConcept ? '<div style="margin-bottom:12px;"><div style="font-weight:bold; color:#1a365d; font-size:10.5pt; margin-bottom:4px;">◆ English Abstract / ஆங்கில குறிப்புரை:</div><div style="text-indent:20px; line-height:1.6; font-size:9.5pt;">' + enConcept + '</div></div>' : (!taConcept ? '<div>விவரங்கள் ஏதும் உள்ளிடப்படவில்லை.</div>' : '')) +
    '  </div>' +
    '</div>' +

    '</body></html>';

  return html;
}

function resetSchoolAuthData() {
  var sheets = getOrCreateSheets();
  var schoolSheet = sheets.schoolSheet;
  
  if (schoolSheet.getLastRow() > 1) {
    schoolSheet.deleteRows(2, schoolSheet.getLastRow() - 1);
  }
  Logger.log("✅ இதுவரை பதிவு செய்யப்பட்ட பள்ளிகளின் விவரங்கள் வெற்றிகரமாக அழிக்கப்பட்டன (Registered schools cleared).");
  return { status: "success", message: "பதிவு செய்யப்பட்ட பள்ளிகளின் விவரங்கள் வெற்றிகரமாக அழிக்கப்பட்டன." };
}

function resetAllSystemData() {
  var sheets = getOrCreateSheets();
  var schoolSheet = sheets.schoolSheet;
  var appSheet = sheets.appSheet;
  
  if (schoolSheet.getLastRow() > 1) {
    schoolSheet.deleteRows(2, schoolSheet.getLastRow() - 1);
  }
  if (appSheet.getLastRow() > 1) {
    appSheet.deleteRows(2, appSheet.getLastRow() - 1);
  }
  Logger.log("✅ அனைத்து பள்ளி மற்றும் விண்ணப்பப் பதிவு விவரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன (All test data cleared).");
  return { status: "success", message: "அனைத்து பதிவுத் தரவுகளும் வெற்றிகரமாக அழிக்கப்பட்டன." };
}


// =========================================================================
// ADMIN PANEL BACKEND: DIRECT SCHOOL PASSWORD RESET & WINNERS RECORDING
// =========================================================================
function handleAdminResetSchoolPassword(data) {
  var sheets = getOrCreateSheets();
  var sheet = sheets.schoolSheet;
  var udise = (data.udiseNo || "").toString().trim();
  var uNo = (data.uNo || "").toString().trim();
  var cleanU = uNo.replace(/^0+/, "");
  var newPassword = (data.newPassword || data.password || "").toString().trim();
  var email = fixEmailTyposServer((data.schoolEmail || "").toString().trim());

  if (!newPassword || newPassword.length < 4) {
    return { status: "error", message: "கடவுச்சொல் குறைந்தது 4 எழுத்துகளாக இருக்க வேண்டும்." };
  }

  var rows = sheet.getDataRange().getValues();
  var targetRowIdx = -1;
  for (var i = 1; i < rows.length; i++) {
    var rUdise = (rows[i][0] || "").toString().trim();
    var rUNo = (rows[i][1] || "").toString().trim();
    if ((udise && rUdise === udise) || (uNo && (rUNo === uNo || rUNo.replace(/^0+/, "") === cleanU))) {
      targetRowIdx = i + 1;
      break;
    }
  }

  var nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  if (targetRowIdx !== -1) {
    if (email && email.indexOf("@") !== -1) sheet.getRange(targetRowIdx, 7).setValue(email);
    sheet.getRange(targetRowIdx, 10).setValue(newPassword);
    sheet.getRange(targetRowIdx, 12).setValue("Admin Reset: " + nowStr);
  } else {
    sheet.appendRow([
      udise,
      uNo,
      data.nameEn || "",
      data.nameTa || "",
      data.block || "",
      data.schoolContact || "",
      email || "-",
      data.schoolManagement || "Government",
      data.hmName || "",
      newPassword,
      nowStr,
      "Admin Created: " + nowStr,
      "",
      ""
    ]);
  }

  if (email && email.indexOf("@") !== -1) {
    sendCredentialsEmail({
      udiseNo: udise,
      uNo: uNo,
      nameTa: data.nameTa || "",
      nameEn: data.nameEn || "",
      schoolEmail: email
    }, newPassword, true);
  }

  return {
    status: "success",
    message: "பள்ளியின் கடவுச்சொல் நிர்வாகியால் வெற்றிகரமாக மாற்றியமைக்கப்பட்டது."
  };
}

function normalizeWinnerPrizeRankServer(rawRank) {
  var r = (rawRank || "").toString().trim();
  if (r.indexOf("முதலிடம்") !== -1 || r.indexOf("1st") !== -1 || r.indexOf("மாநில") !== -1) {
    return "🥇 முதலிடம் (மாநில அளவிலான போட்டிக்கு தேர்வு)";
  }
  if (r.indexOf("இரண்டாம்") !== -1 || r.indexOf("2nd") !== -1) {
    return "🥈 இரண்டாமிடம்";
  }
  if (r.indexOf("மூன்றாம்") !== -1 || r.indexOf("3rd") !== -1) {
    return "🥉 மூன்றாமிடம்";
  }
  if (r.indexOf("சிறப்ப") !== -1 || r.indexOf("Special") !== -1) {
    return "🌟 சிறப்பிடம்";
  }
  if (r.indexOf("பங்கேற்பாளர்") !== -1 || r.indexOf("Participant") !== -1) {
    return "🎖️ பங்கேற்பாளர்";
  }
  return r || "🥇 முதலிடம் (மாநில அளவிலான போட்டிக்கு தேர்வு)";
}

function handleAdminSaveWinner(data) {
  data.prizeRank = normalizeWinnerPrizeRankServer(data.prizeRank);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var winSheet = ss.getSheetByName("SISF_Winners");
  if (!winSheet) {
    winSheet = ss.insertSheet("SISF_Winners");
    winSheet.appendRow([
      "ID", "Timestamp", "Category", "Prize / Rank", "Reg No", "U.NO",
      "School Name", "Student 1", "Student 2", "Guide Teacher & Mobile",
      "Discipline", "Exhibit Title"
    ]);
    formatHeaderRow(winSheet, 12, "#b45309");
  }
  winSheet.appendRow([
    data.id || ("WIN_" + new Date().getTime()),
    data.updatedAt || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    data.category || "",
    data.prizeRank || "",
    data.regNo || "",
    data.uNo || "",
    data.schoolName || "",
    data.student1 || "",
    data.student2 || "",
    data.teacher || "",
    data.discipline || "",
    data.exhibitTitle || ""
  ]);
  return { status: "success", message: "வெற்றியாளர் விவரம் சேமிக்கப்பட்டது." };
}


// பங்கேற்பாளர் விண்ணப்பப் பதிவை நீக்குதல் (Admin Delete Participant Application)
function handleAdminDeleteApplication(data) {
  var regNo = (data.regNo || "").toString().trim();
  var uNo = (data.uNo || "").toString().replace(/^0+/, "").trim();
  var udise = (data.udiseNo || "").toString().trim();
  var cat = (data.category || "").toString().trim();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var appSheet = ss.getSheetByName(SHEET_APPLICATIONS);
  var deletedApps = 0;

  if (appSheet && appSheet.getLastRow() > 1) {
    var rows = appSheet.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      var rReg = (rows[i][1] || "").toString().trim();
      var rUdise = (rows[i][2] || "").toString().trim();
      var rUno = (rows[i][3] || "").toString().replace(/^0+/, "").trim();
      var rCat = (rows[i][9] || "").toString().trim();

      var matchByReg = (regNo && rReg === regNo);
      var matchBySchoolCat = (cat && (cat === "ALL" || rCat === cat) && ((uNo && rUno === uNo) || (udise && rUdise === udise)));
      if (matchByReg || matchBySchoolCat) {
        appSheet.deleteRow(i + 1);
        deletedApps++;
      }
    }
  }

  var winSheet = ss.getSheetByName("SISF_Winners");
  if (winSheet && winSheet.getLastRow() > 1) {
    var wRows = winSheet.getDataRange().getValues();
    for (var j = wRows.length - 1; j >= 1; j--) {
      var wCat = (wRows[j][2] || "").toString().trim();
      var wReg = (wRows[j][4] || "").toString().trim();
      var wUno = (wRows[j][5] || "").toString().replace(/^0+/, "").trim();
      if ((regNo && wReg === regNo) || (cat && (cat === "ALL" || wCat === cat) && uNo && wUno === uNo)) {
        winSheet.deleteRow(j + 1);
      }
    }
  }

  return {
    status: "success",
    deletedCount: deletedApps,
    message: "பங்கேற்பாளர் விண்ணப்பப் பதிவு வெற்றிகரமாக நீக்கப்பட்டது."
  };
}

// பள்ளி உள்நுழைவு மற்றும் அதனுடன் தொடர்புடைய பதிவுகளை நீக்குதல் (Admin Delete School & Its Applications)
function handleAdminDeleteSchool(data) {
  var uNo = (data.uNo || "").toString().replace(/^0+/, "").trim();
  var udise = (data.udiseNo || "").toString().trim();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schSheet = ss.getSheetByName(SHEET_SCHOOLS);
  var deletedSchools = 0;

  if (schSheet && schSheet.getLastRow() > 1) {
    var sRows = schSheet.getDataRange().getValues();
    for (var i = sRows.length - 1; i >= 1; i--) {
      var rUdise = (sRows[i][0] || "").toString().trim();
      var rUno = (sRows[i][1] || "").toString().replace(/^0+/, "").trim();
      if ((uNo && rUno === uNo) || (udise && rUdise === udise)) {
        schSheet.deleteRow(i + 1);
        deletedSchools++;
      }
    }
  }

  var appSheet = ss.getSheetByName(SHEET_APPLICATIONS);
  if (appSheet && appSheet.getLastRow() > 1) {
    var aRows = appSheet.getDataRange().getValues();
    for (var k = aRows.length - 1; k >= 1; k--) {
      var aUdise = (aRows[k][2] || "").toString().trim();
      var aUno = (aRows[k][3] || "").toString().replace(/^0+/, "").trim();
      if ((uNo && aUno === uNo) || (udise && aUdise === udise)) {
        appSheet.deleteRow(k + 1);
      }
    }
  }

  var winSheet = ss.getSheetByName("SISF_Winners");
  if (winSheet && winSheet.getLastRow() > 1) {
    var wRows = winSheet.getDataRange().getValues();
    for (var m = wRows.length - 1; m >= 1; m--) {
      var wUno = (wRows[m][5] || "").toString().replace(/^0+/, "").trim();
      if ((uNo && wUno === uNo) || (udise && wUno === udise)) {
        winSheet.deleteRow(m + 1);
      }
    }
  }

  return {
    status: "success",
    deletedSchools: deletedSchools,
    message: "பள்ளி மற்றும் அதன் விண்ணப்பப் பதிவுகள் வெற்றிகரமாக நீக்கப்பட்டன."
  };
}
