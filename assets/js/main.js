const { ipcRenderer } = require("electron");
var skinsData = null,
  champData = null;
const champList = document.getElementById("champs");
const skinList = document.getElementById("skins");
const submitButton = document.getElementById("submit");
const version = document.getElementById("version");

version.innerText = "v" + ipcRenderer.sendSync("getAppVersion");

ipcRenderer.on("message", (event, message) => {
  console.log(message);
});

function checkData() {
  skinsData = ipcRenderer.sendSync("getClientApi", "/lol-game-data/assets/v1/skins.json"); // * all skins data
  champData = ipcRenderer.sendSync("getClientApi", "/lol-game-data/assets/v1/champion-summary.json"); // * all champs data
  if (skinsData == null || champData == null) {
    setTimeout(() => {
      checkData();
    }, 2000);
  } else {
    champData.splice(0, 1); // * Delete champId: -1
    champData.forEach((element) => {
      if (!element["alias"].includes("Strawberry_")) {
        // * Don't add strawberry champs
        champList.innerHTML += `<option value="${element["id"]}">${element["name"]}</option>`;
      }
    });
    currentBackgroundSkinUpdate();
    sortSelectOptions(document.getElementById("champs"));
  }
}

champList.addEventListener("change", () => {
  updateSkinList(champList.value);
});

function updateSkinList(champId) {
  if (champId != -1) {
    skinList.innerHTML = "";
    var getSkinData = ipcRenderer.sendSync("getClientApi", `/lol-game-data/assets/v1/champions/${champId}.json`)["skins"];
    getSkinData.forEach((element) => {
      skinList.innerHTML += `<option value="${element["id"]}">${element["name"]}</option>`;
      if (element["questSkinInfo"]) {
        // * For skins with skin level
        if (element["questSkinInfo"]["tiers"]) {
          element["questSkinInfo"]["tiers"].splice(0, 1);
          element["questSkinInfo"]["tiers"].forEach((element1) => {
            skinList.innerHTML += `<option value="${element1["id"]}">${element1["name"]}</option>`;
          });
        }
      }
    });
  } else {
    skinList.innerHTML = "";
  }
}

submitButton.addEventListener("click", () => {
  ipcRenderer.send("postClientApi", {
    endpoint: "/lol-summoner/v1/current-summoner/summoner-profile",
    json: {
      key: "backgroundSkinId",
      value: skinList.value,
    },
  });
});

ipcRenderer.on("postClientApiResponse", (event, response) => {
  if (response.success) {
    ipcRenderer.send("showMessageBox", {
      message: "Profil Arka Plan Resmi Başarıyla Uygulandı!",
      title: "Başarılı",
      buttons: ["Ok"],
      type: "info",
    });
    currentBackgroundSkinUpdate();
  }
});

function currentBackgroundSkinUpdate() {
  var currentBackgroundSkinId = ipcRenderer.sendSync("getClientApi", "/lol-summoner/v1/current-summoner/summoner-profile");
  if (currentBackgroundSkinId == null) {
    setTimeout(() => {
      currentBackgroundSkinUpdate();
    }, 2000);
  } else {
    currentBackgroundSkinId = currentBackgroundSkinId["backgroundSkinId"];
    if (currentBackgroundSkinId != 147002 && currentBackgroundSkinId != 147003 && currentBackgroundSkinId != 103086) {
      document.body.style.backgroundImage = `url(data:image/png;base64,${ipcRenderer.sendSync("getClientApiImg", skinsData[currentBackgroundSkinId]["splashPath"])})`;
    } else if (currentBackgroundSkinId == 147002) {
      document.body.style.backgroundImage = `url(data:image/png;base64,${ipcRenderer.sendSync("getClientApiImg", "/lol-game-data/assets/ASSETS/Characters/Seraphine/Skins/Skin02/Images/seraphine_splash_centered_2.jpg")})`;
    } else if (currentBackgroundSkinId == 147003) {
      document.body.style.backgroundImage = `url(data:image/png;base64,${ipcRenderer.sendSync("getClientApiImg", "/lol-game-data/assets/ASSETS/Characters/Seraphine/Skins/Skin03/Images/seraphine_splash_centered_3.jpg")})`;
    } else if (currentBackgroundSkinId == 103086) {
      document.body.style.backgroundImage = `url(data:image/png;base64,${ipcRenderer.sendSync("getClientApiImg", "/lol-game-data/assets/ASSETS/Characters/Ahri/Skins/Skin86/Images/ahri_splash_centered_86.SKINS_Ahri_HoL.jpg")})`;
    }
  }
}

function sortSelectOptions(selectElement) {
  var options = selectElement.querySelectorAll("option");
  var optionsArray = Array.from(options);

  var firstOption = optionsArray.shift();
  optionsArray.sort(function (a, b) {
    return a.text.localeCompare(b.text);
  });

  selectElement.innerHTML = "";
  selectElement.appendChild(firstOption);
  optionsArray.forEach(function (option) {
    selectElement.appendChild(option);
  });
}

checkData();
