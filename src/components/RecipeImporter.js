// src/components/RecipeImporter.js
import React, { useState } from 'react';
import './RecipeImporter.css';

const unitSynonyms = {
  "ml": "ml", "millilitra": "ml", "millilitraa": "ml",
  "cl": "cl", "senttilitra": "cl", "senttilitraa": "cl",
  "dl": "dl", "desilitra": "dl", "desilitraa": "dl",
  "l": "l", "litra": "l", "litraa": "l",
  "g": "g", "gramma": "g", "grammaa": "g",
  "kg": "kg", "kilo": "kg", "kiloa": "kg", "kilogramma": "kg", "kilogrammaa": "kg",
  "kpl": "kpl", "kappaletta": "kpl", "kappale": "kpl",
  "rs": "rs", "rasia": "rs", "rasiaa": "rs",
  "tl": "tl", "teelusikka": "tl", "teelusikkaa": "tl",
  "rkl": "rkl", "ruokalusikka": "rkl", "ruokalusikkaa": "rkl",
  "ripaus": "ripaus",
  "pullo": "plo", "plo": "plo",
  "pkt": "pkt", "paketti": "pkt", "pakettia": "pkt",
  "prk": "prk", "purkki": "prk", "purkkia": "prk",
  "pss": "pss", "pussi": "pss",
  "tlk": "tlk", "tölkki": "tlk",
  "vartta": "vartta",
  "varsi": "varsi",
  "":" ", // Tyhjä yksikkö normalisoidaan välilyönniksi myöhemmin, jos tarpeen
};

function normalizeUnit(unit) {
  const lowerUnit = (unit || '').trim().toLowerCase();
  const normalized = unitSynonyms[lowerUnit];
  return normalized || unit.trim();
}

function parseFraction(str) {
  const fractions = {
    '¼': 0.25, '½': 0.5, '¾': 0.75,
    '⅓': 1/3, '⅔': 2/3,
    '⅕': 1/5, '⅖': 2/5, '⅗': 3/5, '⅘': 4/5,
    '⅙': 1/6, '⅚': 5/6,
    '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8,
  };
  if (fractions[str]) {
    return fractions[str];
  }
  // Kokeillaan, jos murtoluku on osa merkkijonoa, esim. "½tl" -> "½"
  if (str.length > 0 && fractions[str.charAt(0)]) {
    const restOfString = str.substring(1).trim();
    // Varmistetaan, ettei murtoluvun jälkeen tule heti numeroa, joka voisi olla osa määrää
    if (restOfString === '' || isNaN(parseFloat(restOfString.charAt(0)))) {
        return fractions[str.charAt(0)];
    }
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  }
  return NaN;
}

const RecipeImporter = ({ onRecipeParsed, showToast }) => {
  const [recipeText, setRecipeText] = useState('');

  const parseAmountString = (amountStrInput) => {
    if (!amountStrInput || String(amountStrInput).trim() === '') return ''; // Palauta tyhjä, jos syöte on tyhjä
    let amountStr = String(amountStrInput).trim();
    console.log(`  parseAmountString - input: "${amountStr}"`);

    const fractionValue = parseFraction(amountStr);
    if (!isNaN(fractionValue)) {
        console.log(`  parseAmountString - fraction recognized: ${fractionValue}`);
        return fractionValue;
    }

    // Käsittele "-" vain osana lukualuetta, älä oleta sen olevan negatiivinen luku ilman kontekstia
    if (amountStr.includes('-') && !amountStr.startsWith('-')) { // Sallii negatiiviset luvut, mutta käsittelee välialueet
      const parts = amountStr.split('-');
      if (parts.length > 0) amountStr = parts[0].trim(); // Käytä ensimmäistä osaa alueesta
      console.log(`  parseAmountString - range recognized, using: "${amountStr}"`);
    }
    
    amountStr = amountStr.replace(',', '.');
    const parsed = parseFloat(amountStr);
    // ÄLÄ palauta 1, jos NaN. Palauta alkuperäinen merkkijono, jos parseFloat epäonnistuu,
    // tai tyhjä, jos halutaan nimenomaan numeerinen arvo tai ei mitään.
    // Tässä tapauksessa, jos amountStr ei ole validi luku, se voi olla osa nimeä.
    // Jätetään RecipeFormin vastuulle validoinnin. Tässä pyritään vain numeroon.
    const result = isNaN(parsed) ? '' : parsed; // Palauta tyhjä merkkijono, jos ei ole luku
    console.log(`  parseAmountString - parseFloat result: ${result} (from "${amountStr}")`);
    return result;
  };

  const parseSingleIngredientLine = (line) => {
    const originalLine = line;
    console.log(`--- parseSingleIngredientLine ALKU --- Rivi: "${originalLine}"`);
    let currentLine = line.replace(/\t+/g, ' ').trim();
    let amount = ''; // MUUTETTU: Oletusarvo tyhjä merkkijono
    let unit = '';
    let name = '';
    let amountStringPart = '';

    const initialNumberRegex = /^(\d+)(\s+|$)/;
    let initialNumberMatch = currentLine.match(initialNumberRegex);
    let mainAmountString = '';
    let combinedAmount = NaN; // MUUTETTU: NaN oletuksena

    if (initialNumberMatch && initialNumberMatch[1]) {
        mainAmountString = initialNumberMatch[1].trim();
        const parsedMainAmount = parseFloat(mainAmountString.replace(',', '.'));
        if (!isNaN(parsedMainAmount)) combinedAmount = parsedMainAmount;

        let lineAfterInitialNumber = currentLine.substring(initialNumberMatch[0].length).trim();
        console.log(`   Alkuosa määrästä tunnistettu: mainAmountString="${mainAmountString}", combinedAmount=${combinedAmount}, lineAfterInitialNumber="${lineAfterInitialNumber}"`);

        const fractionRegex = /^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|(?:\d+\s*\/\s*\d+))(\s+|$)/i;
        const fractionMatch = lineAfterInitialNumber.match(fractionRegex);

        if (fractionMatch && fractionMatch[1]) {
            const fractionStringPart = fractionMatch[1].trim();
            const fractionValue = parseFraction(fractionStringPart);
            if (!isNaN(fractionValue)) {
                combinedAmount = (isNaN(combinedAmount) ? 0 : combinedAmount) + fractionValue; // Lisää murtoluku
                amountStringPart = `${mainAmountString} ${fractionStringPart}`;
                currentLine = lineAfterInitialNumber.substring(fractionMatch[0].length).trim();
                console.log(`    Lisätty murtoluku (${fractionStringPart}=${fractionValue}) määrään: combinedAmount=${combinedAmount}, currentLine nyt="${currentLine}"`);
            } else {
                amountStringPart = mainAmountString;
                currentLine = lineAfterInitialNumber;
            }
        } else {
            amountStringPart = mainAmountString;
            currentLine = lineAfterInitialNumber;
        }
        amount = isNaN(combinedAmount) ? '' : combinedAmount; // Aseta amount, jos validi luku
        
    } else {
        // Jos ei alkanut kokonaisluvulla, kokeile suoraan murtolukuja/yleistä määrää
        // Päivitetty regex tunnistamaan myös desimaalit ja murtoluvut ilman välitöntä välilyöntiä
        const generalAmountOrUnitRegex = /^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|(?:\d+[,.]\d*)|\d+)([a-zA-ZäöåÄÖÅμ]*)(.*)/i;
        let generalMatch = currentLine.match(generalAmountOrUnitRegex);

        if (generalMatch) {
            const potentialAmountStr = generalMatch[1] ? generalMatch[1].trim() : '';
            const potentialUnitStr = generalMatch[2] ? generalMatch[2].trim() : '';
            const restOfLineAfterMatch = (generalMatch[3] || "").trim();

            const parsedPotentialAmount = parseAmountString(potentialAmountStr);

            if (parsedPotentialAmount !== '') { // Jos amount on validi
                amountStringPart = potentialAmountStr;
                amount = parsedPotentialAmount;
                currentLine = (potentialUnitStr + " " + restOfLineAfterMatch).trim(); // Yksikkö ja loppuosa siirtyvät jatkokäsittelyyn
                console.log(`   Yleinen määräosa tunnistettu: amountStringPart="${amountStringPart}", ParsedAmount=${amount}, currentLine nyt="${currentLine}"`);
            } else if (potentialAmountStr && unitSynonyms[potentialAmountStr.toLowerCase()]) {
                 // Jos amount-osa itsessään oli tunnettu yksikkö (esim. "tl sokeria")
                unit = potentialAmountStr;
                amount = ''; // Ei numeerista määrää
                amountStringPart = '';
                currentLine = (potentialUnitStr + " " + restOfLineAfterMatch).trim();
                console.log(`   Tunnistettu yksikkö määrän paikalla: unit="${unit}", currentLine nyt="${currentLine}"`);

            } else {
                // Ei tunnistettu selkeää määrää, amount pysyy tyhjänä
                amount = '';
                amountStringPart = '';
                console.log(`   Ei selkeää määräosaa tunnistettu alusta, currentLine käsittelyyn yksikölle/nimelle="${currentLine}"`);
            }
        } else {
            amount = ''; // MUUTETTU: Oletusarvo tyhjä merkkijono
            amountStringPart = '';
            console.log(`   Ei selkeää määräosaa tunnistettu alusta, currentLine käsittelyyn yksikölle/nimelle="${currentLine}"`);
        }
    }
    
    let tempRemainingForUnit = currentLine;
    console.log(`   Aloitetaan yksikön etsintä, tempRemainingForUnit: "${tempRemainingForUnit}"`);
    const knownUnits = Object.keys(unitSynonyms).filter(u => u !== '' && u !== ' ');
    knownUnits.sort((a, b) => b.length - a.length); 

    if (unit === '') { 
        for (const knownUnit of knownUnits) {
            // Etsitään yksikköä rivin alusta (jäljellä olevasta osasta)
            if (tempRemainingForUnit.toLowerCase().startsWith(knownUnit.toLowerCase())) {
                // Varmistetaan, että se on kokonainen sana tai sitä seuraa ei-aakkosnumeerinen merkki (tai rivin loppu)
                const unitCandidate = tempRemainingForUnit.substring(0, knownUnit.length);
                const charAfterUnit = tempRemainingForUnit.length > knownUnit.length ? tempRemainingForUnit.charAt(knownUnit.length) : '';
                if (unitCandidate.toLowerCase() === knownUnit.toLowerCase() && (charAfterUnit === '' || !charAfterUnit.match(/[a-zA-ZäöåÄÖÅμ0-9]/i))) {
                    unit = unitCandidate;
                    tempRemainingForUnit = tempRemainingForUnit.substring(unit.length).trim();
                    console.log(`   Yksikkö tunnistettu: unit="${unit}", tempRemainingForUnit nyt="${tempRemainingForUnit}"`);
                    break;
                }
            }
        }
    }
    
    name = tempRemainingForUnit.trim();

    // Jos nimi on tyhjä, mutta alkuperäinen rivi ei ollut, ja määrää tai yksikköä ei ole spesifioitu,
    // käytä alkuperäistä riviä nimenä.
    if (name === '' && amount === '' && unit === '' && originalLine.trim() !== '') {
        name = originalLine.trim();
        console.log(`   Nimi asetettu originalLineksi (koska kaikki muu tyhjää/oletus tai ei määrää): "${name}"`);
    }
    
    const result = {
        name: name,
        amount: amount, // Voi olla numero tai tyhjä merkkijono
        unit: normalizeUnit(unit),
        originalLine: originalLine,
        isEmptyName: name === '',
        amountStringPart: amountStringPart
    };
    console.log(`--- parseSingleIngredientLine LOPPU --- Palautetaan:`, JSON.stringify(result));
    return result;
  }

  const parseRecipe = () => {
    if (!recipeText.trim()) {
      showToast('Liitä ensin reseptiteksti.', 'error');
      return;
    }
    console.log("--- parseRecipe ALKU --- Koko teksti:\n", recipeText);

    const lines = recipeText.split('\n').map(line => line.trim());
    let parsedName = '';
    const parsedIngredients = [];
    let parsedInstructionsArray = [];
    let readingStage = 'name';

    let firstHeaderIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/^(ainekset|ainesosat|raaka-aineet|ohjeet|ohje|valmistusohje|valmistus)/i.test(lines[i])) {
            firstHeaderIndex = i;
            break;
        }
    }

    if (firstHeaderIndex > 0) {
        parsedName = lines.slice(0, firstHeaderIndex).filter(l => l.trim() !== '').join(' ').trim();
    } else if (firstHeaderIndex === -1 && lines.length > 0) {
        const firstNonEmpty = lines.find(l => l.trim() !== '');
        if (firstNonEmpty) parsedName = firstNonEmpty;
    }
    
    if (!parsedName && lines.length > 0 && lines[0].trim() !== '' && !/^(ainekset|ainesosat|raaka-aineet|ohjeet|ohje|valmistusohje|valmistus)/i.test(lines[0])) {
        parsedName = lines[0].trim();
    }
    console.log(`Nimen alustava tunnistus: "${parsedName}"`);

    readingStage = 'ingredients_header_search';
    let tempIngredientBuffer = null;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      console.log(`Käsitellään rivi ${i + 1}: "${line}", Tila: ${readingStage}`);

      const isIngredientsKeyword = /^(ainekset|ainesosat|raaka-aineet)/i.test(line);
      const isInstructionsKeyword = /^(ohjeet|ohje|valmistusohje|valmistus)/i.test(line);

      if (isIngredientsKeyword) {
        if (tempIngredientBuffer && tempIngredientBuffer.isEmptyName) {
            parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine, amount: tempIngredientBuffer.amount === 1 && tempIngredientBuffer.amountStringPart === '' ? '' : tempIngredientBuffer.amount });
            console.log("   Puskuri (tyhjä nimi) lisätty ennen INGREDIENTS headeria:", tempIngredientBuffer.originalLine);
        }
        tempIngredientBuffer = null;
        readingStage = 'ingredients';
        console.log("   Vaihdettu tilaan: ingredients");
        continue;
      } else if (isInstructionsKeyword) {
        if (tempIngredientBuffer && tempIngredientBuffer.isEmptyName) {
             parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine, amount: tempIngredientBuffer.amount === 1 && tempIngredientBuffer.amountStringPart === '' ? '' : tempIngredientBuffer.amount });
             console.log("   Puskuri (tyhjä nimi) lisätty ennen INSTRUCTIONS headeria:", tempIngredientBuffer.originalLine);
        }
        tempIngredientBuffer = null;
        readingStage = 'instructions';
        console.log("   Vaihdettu tilaan: instructions");
        continue;
      }

      if (line === '') {
          if (tempIngredientBuffer && tempIngredientBuffer.isEmptyName) {
              parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine, amount: tempIngredientBuffer.amount === 1 && tempIngredientBuffer.amountStringPart === '' ? '' : tempIngredientBuffer.amount });
              console.log("   Puskuri (tyhjä nimi) lisätty tyhjän rivin yhteydessä:", tempIngredientBuffer.originalLine);
          }
          tempIngredientBuffer = null;
          console.log("   Tyhjä rivi, nollataan puskuri.");
          continue;
      }
      
      if (readingStage === 'ingredients') {
        const currentParsed = parseSingleIngredientLine(line);
        
        if (tempIngredientBuffer) {
            console.log("   Käsitellään puskuria:", JSON.stringify(tempIngredientBuffer));
            console.log("   Nykyinen jäsennetty:", JSON.stringify(currentParsed));
            // Jos nykyisellä ei ole määrää eikä yksikköä, ja sillä on nimi, yhdistä se puskuroidun nimeen
            if (currentParsed.amount === '' && currentParsed.unit === normalizeUnit('') && currentParsed.name && !currentParsed.isEmptyName) {
                tempIngredientBuffer.name = (`${tempIngredientBuffer.name || ''} ${currentParsed.name}`).trim();
                if (currentParsed.name) tempIngredientBuffer.isEmptyName = false;
                
                // Korjaus: Jos alkuperäinen puskuroitu rivi oli vain määrä/yksikkö, ja nyt tulee nimi
                if (tempIngredientBuffer.originalLine === tempIngredientBuffer.amountStringPart + (tempIngredientBuffer.unit === normalizeUnit('') ? '' : tempIngredientBuffer.unit) && currentParsed.name) {
                    // tempIngredientBuffer.name was previously set to originalLine which was just amount/unit
                    // now we have a proper name part
                }


                parsedIngredients.push(tempIngredientBuffer);
                console.log("   Yhdistetty puskuriin, tulos:", JSON.stringify(tempIngredientBuffer));
                tempIngredientBuffer = null;
            } else { // Muuten, puskuri on valmis
                if (tempIngredientBuffer.isEmptyName) {
                     parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine, amount: tempIngredientBuffer.amount === 1 && tempIngredientBuffer.amountStringPart === '' ? '' : tempIngredientBuffer.amount });
                     console.log("   Puskuri (tyhjä nimi) purettu erillisenä:", tempIngredientBuffer.originalLine);
                } else {
                    parsedIngredients.push(tempIngredientBuffer);
                     console.log("   Puskuri purettu:", JSON.stringify(tempIngredientBuffer));
                }
                
                // Käsittele nykyinen jäsennetty rivi
                if (currentParsed.isEmptyName && (currentParsed.unit !== normalizeUnit('') || currentParsed.amount !== '')) {
                    tempIngredientBuffer = currentParsed; // Puskuroi, jos vain määrä/yksikkö ilman nimeä
                    console.log("   Nykyinen puskuroitu (edellinen purettiin):", JSON.stringify(currentParsed));
                } else if (currentParsed.name || currentParsed.amount !== '' || currentParsed.unit !== normalizeUnit('')) {
                    parsedIngredients.push(currentParsed); // Lisää suoraan, jos siinä on tarpeeksi tietoa
                     console.log("   Nykyinen lisätty suoraan (edellinen puskuri purettiin):", JSON.stringify(currentParsed));
                    tempIngredientBuffer = null;
                } else { // Ei tarpeeksi tietoa, mutta alkuperäinen rivi oli olemassa
                    if (currentParsed.originalLine && currentParsed.originalLine.trim() !== '') {
                        parsedIngredients.push({ name: currentParsed.originalLine, amount: '', unit: normalizeUnit('')});
                        console.log("   Nykyinen lisätty alkuperäisenä rivinä (ei tunnistettu dataa):", currentParsed.originalLine);
                    }
                    tempIngredientBuffer = null;
                }
            }
        } else { // Ei puskuria
            if (currentParsed.isEmptyName && (currentParsed.unit !== normalizeUnit('') || currentParsed.amount !== '')) {
                // Jos rivi on vain määrä ja/tai yksikkö ilman nimeä, puskuroi se.
                // Esim. "2 dl" tai "1 kpl" tai pelkkä "2"
                 if (currentParsed.unit !== normalizeUnit('') || (currentParsed.amount !=='' && currentParsed.originalLine.match(/^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|(?:\d+[\s,.]*\d*(?:\s*-\s*\d+[\s,.]*\d*)?)|(?:\d*\s*[/]\s*\d+)|(?:\d+[,.]\d*)|^\d+)/i)) ) {
                    tempIngredientBuffer = currentParsed;
                    console.log("   Puskuroitu (ei ed. puskuria):", JSON.stringify(currentParsed));
                 } else if (currentParsed.originalLine && currentParsed.originalLine.trim() !== ''){
                     // Jos ei tunnistettu määrää/yksikköä, mutta rivi ei ole tyhjä, lisää se nimenä
                     parsedIngredients.push({name: currentParsed.originalLine, amount:'', unit: normalizeUnit('')});
                     console.log("   Lisätty alkuperäinen rivi nimellä (ei ed. puskuria, ei tunnistettu dataa, ei puskuroitu):", currentParsed.originalLine);
                     tempIngredientBuffer = null;
                 } else {
                    tempIngredientBuffer = null; // Tyhjä rivi tai merkityksetön
                 }
            } else  { // Jos rivillä on nimi tai se on muuten täydellinen, lisää se suoraan
                if (currentParsed.name || currentParsed.amount !== '' || currentParsed.unit !== normalizeUnit('')) {
                    parsedIngredients.push(currentParsed);
                    console.log("   Lisätty suoraan (ei ed. puskuria):", JSON.stringify(currentParsed));
                } else if (currentParsed.originalLine && currentParsed.originalLine.trim() !== ''){
                     // Viimeinen oljenkorsi: jos mitään ei tunnistettu, mutta rivi ei ole tyhjä, käytä sitä nimenä
                     parsedIngredients.push({name: currentParsed.originalLine, amount:'', unit: normalizeUnit('')});
                     console.log("   Lisätty alkuperäinen rivi nimellä (ei ed. puskuria, ei tunnistettu dataa):", currentParsed.originalLine);
                }
                tempIngredientBuffer = null;
            }
        }

      } else if (readingStage === 'instructions' && line) {
        const cleanedInstruction = line.replace(/^\d+\.\s*/, '').trim(); // Poistaa numeroinnin
        if (cleanedInstruction) {
            parsedInstructionsArray.push(cleanedInstruction);
        }
      }
    }

    // Käsittele viimeinen mahdollinen puskuri
    if (tempIngredientBuffer) {
        if (tempIngredientBuffer.isEmptyName && tempIngredientBuffer.originalLine.trim() !== '') {
            // Jos puskurissa on vain määrä/yksikkö, mutta ei nimeä, käytä alkuperäistä riviä nimenä
            parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine, amount: tempIngredientBuffer.amount === 1 && tempIngredientBuffer.amountStringPart === '' ? '' : tempIngredientBuffer.amount });
        } else if (!tempIngredientBuffer.isEmptyName) {
            parsedIngredients.push(tempIngredientBuffer);
        }
        console.log("--- Viimeinen puskuri purettu:", JSON.stringify(tempIngredientBuffer));
    }

    // Jos nimeä ei tunnistettu, mutta ainesosia tai ohjeita on, yritä ottaa ensimmäinen ei-tyhjä rivi nimeksi
    if (!parsedName && (parsedIngredients.length > 0 || parsedInstructionsArray.length > 0)) {
        const firstNonEmptyLine = lines.find(l => l.trim() !== '');
        if(firstNonEmptyLine && !/^(ainekset|ainesosat|raaka-aineet|ohjeet|ohje|valmistusohje|valmistus)/i.test(firstNonEmptyLine)) {
            parsedName = firstNonEmptyLine;
        }
    }
    
    console.log("--- LOPULLINEN Jäsennetty nimi:", parsedName);
    console.log("--- LOPULLINEN Jäsennetty ainesosat:", parsedIngredients.map(ing => ({name: ing.name, amount: ing.amount, unit: ing.unit})));
    console.log("--- LOPULLINEN Jäsennetty ohjeet:", parsedInstructionsArray);

    if (!parsedName && parsedIngredients.length === 0 && parsedInstructionsArray.length === 0 && recipeText) {
        showToast('Reseptin jäsentäminen epäonnistui. Tarkista tekstin muoto ja varmista otsikot.', 'error');
        return;
    }
    
    const finalIngredients = parsedIngredients.map(ing => ({
        name: ing.name,
        // Varmista, että amount on numero tai tyhjä merkkijono RecipeFormia varten
        amount: typeof ing.amount === 'number' ? ing.amount : '',
        unit: ing.unit
    }));


    onRecipeParsed({
      nimi: parsedName,
      // Jos ainesosia ei ole, välitä tyhjä taulukko RecipeFormille, jotta se voi luoda oletusrivin
      ainesosat: finalIngredients.length > 0 ? finalIngredients : [],
      ohjeet: parsedInstructionsArray.join('\n'), // Muuta takaisin merkkijonoksi RecipeFormia varten
    });

    if (parsedName || finalIngredients.length > 0 || parsedInstructionsArray.length > 0) {
        showToast('Resepti jäsennetty. Tarkista tiedot ja tallenna lomake.', 'success');
    } else {
        showToast('Reseptin jäsentäminen ei tuottanut tulosta. Varmista, että reseptissä on "Ainekset" (tai vastaava) ja "Ohjeet" (tai vastaava) -otsikot, tai että ohjeet erotellaan ainesosista tyhjällä rivillä.', 'error');
    }
  };

  return (
    <div className="recipe-importer-container">
      <h2>Tuo resepti tekstimuodossa</h2>
      <p>
        Liitä reseptin teksti alle. Parhaan tuloksen saat, kun reseptissä on selkeät otsikot kuten <strong>"Ainekset"</strong> (tai "Raaka-aineet") ja <strong>"Ohjeet"</strong> (tai "Valmistus") omilla riveillään. Ohjeet voi myös erottaa ainesosista tyhjällä välirivillä.
      </p>
      <textarea
        value={recipeText}
        onChange={(e) => setRecipeText(e.target.value)}
        placeholder={`Esimerkki:
Reseptin Nimi

Raaka-aineet
2 dl vehnäjauhoja
1 tl suolaa
1-2 kpl kananmunia
pekonia (määrä valinnainen)
// tai
1 pkt (170g) pekonia
// tai
ripaus sokeria

Ohjeet
1. Sekoita.
2. Paista.
...`}
        rows="15"
        className="recipe-import-textarea"
        aria-label="Reseptiteksti"
      ></textarea>
      <button onClick={parseRecipe} className="parse-recipe-button">
        Jäsennä ja esitäytä lomake
      </button>
    </div>
  );
};

export default RecipeImporter;