/*
 * v10.37.0｜網站集中設定
 * 這裡只放「設定值」，不放功能邏輯。
 * 之後改版本號、回報 API、Firebase 或 Google Sheet URL，優先從這裡修改。
 */

const APP_VERSION = 'v10.44.0';
const APP_UPDATE_NOTE = '智慧搜尋全文索引升級｜除了字卡與中文意思，也可搜尋例句、翻譯、補充與文法說明；搜尋結果顯示命中來源與片段';

const FEEDBACK_API_URL = 'https://script.google.com/macros/s/AKfycbyUm1thtwdwyCY3TrN7yk7Klclxs9cztFk_nx7oCg6NYucDf_uc5y0QMoggWAHXJ1Xmxg/exec';

const firebaseConfig = {
        apiKey: "AIzaSyClHAkJZ8EJuLHtksAsl8OoXYgdlKtjQZQ",
        authDomain: "japanese-note-4cb5a.firebaseapp.com",
        projectId: "japanese-note-4cb5a",
        storageBucket: "japanese-note-4cb5a.firebasestorage.app",
        messagingSenderId: "931372617510",
        appId: "1:931372617510:web:36823175438ac2618b7be7"
};

const SHEETS_CONFIG = {
        sheet1: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=938197036&single=true&output=csv',
        sheet2: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1844228081&single=true&output=csv',
        sheet3: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1130260118&single=true&output=csv',
        sheet4: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=20080234&single=true&output=csv',
        sheet5: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=591299877&single=true&output=csv',
        sheet6: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1833922770&single=true&output=csv',
        sheet7: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1447704017&single=true&output=csv',
        sheet8: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=124325165&single=true&output=csv',
        sheet9: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1679842630&single=true&output=csv',
        sheet10: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1897403022&single=true&output=csv',
        sheet11: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1587333217&single=true&output=csv',
        sheet12: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1490497949&single=true&output=csv',
        sheet13: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1342438350&single=true&output=csv',
        sheet14: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=373655117&single=true&output=csv',
        sheet15: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1550390723&single=true&output=csv',
        sheet16: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1982280953&single=true&output=csv',
        sheet17: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=369240348&single=true&output=csv',
        sheet18: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1114398002&single=true&output=csv',
        sheet19: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=1377172328&single=true&output=csv',
        sheet20: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=826241804&single=true&output=csv',
        sheet21: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=141438539&single=true&output=csv',
        sheet22: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=584642201&single=true&output=csv',
        sheet24: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=942908072&single=true&output=csv',
        sheet25: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuI3TWj0DObkZG4Pzz0NgeoKwxRIbBmNGJ32mZ0m1aq1fP85_PvDiTGba5feBvPxl9fiETGqEGiiz6/pub?gid=219719106&single=true&output=csv'
};
