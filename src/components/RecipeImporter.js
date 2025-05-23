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
  "":" ",
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
  if (str.length > 0 && fractions[str.charAt(0)]) {
    const restOfString = str.substring(1).trim();
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
    if (!amountStrInput) return 1;
    let amountStr = String(amountStrInput).trim();
    console.log(`  parseAmountString - input: "${amountStr}"`);

    const fractionValue = parseFraction(amountStr);
    if (!isNaN(fractionValue)) {
        console.log(`  parseAmountString - fraction recognized: ${fractionValue}`);
        return fractionValue;
    }

    if (amountStr.includes('-')) {
      const parts = amountStr.split('-');
      if (parts.length > 0) amountStr = parts[0].trim();
      console.log(`  parseAmountString - range recognized, using: "${amountStr}"`);
    }
    
    amountStr = amountStr.replace(',', '.');
    const parsed = parseFloat(amountStr);
    const result = isNaN(parsed) ? 1 : parsed;
    console.log(`  parseAmountString - parseFloat result: ${result} (from "${amountStr}")`);
    return result;
  };

  const parseSingleIngredientLine = (line) => {
    const originalLine = line; 
    console.log(`--- parseSingleIngredientLine ALKU --- Rivi: "${originalLine}"`);
    let currentLine = line.replace(/\t+/g, ' ').trim();
    let amount = 1; 
    let unit = '';
    let name = '';
    let amountStringPart = ''; // Tämä tallentaa alkuperäisen määrämerkkijonon

    const initialNumberRegex = /^(\d+)(\s+|$)/; 
    let initialNumberMatch = currentLine.match(initialNumberRegex);
    let mainAmountString = ''; // Kokonaislukuosa
    let combinedAmount = 0; // Lopullinen numeroarvo

    if (initialNumberMatch && initialNumberMatch[1]) {
        mainAmountString = initialNumberMatch[1].trim();
        combinedAmount = parseFloat(mainAmountString.replace(',', '.'));
        if (isNaN(combinedAmount)) combinedAmount = 0;

        let lineAfterInitialNumber = currentLine.substring(initialNumberMatch[0].length).trim();
        console.log(`   Alkuosa määrästä tunnistettu: mainAmountString="${mainAmountString}", combinedAmount=${combinedAmount}, lineAfterInitialNumber="${lineAfterInitialNumber}"`);

        const fractionRegex = /^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|(?:\d+\s*\/\s*\d+))(\s+|$)/i;
        const fractionMatch = lineAfterInitialNumber.match(fractionRegex);

        if (fractionMatch && fractionMatch[1]) {
            const fractionStringPart = fractionMatch[1].trim();
            const fractionValue = parseFraction(fractionStringPart);
            if (!isNaN(fractionValue)) {
                combinedAmount += fractionValue;
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
        amount = combinedAmount;
        if (amount === 0 && mainAmountString !== "0" && mainAmountString !== "") amount = 1; 
        else if (amount === 0 && mainAmountString === "0") amount = 0;
        
    } else {
        // Jos ei alkanut kokonaisluvulla, kokeile suoraan murtolukuja/yleistä määrää
        const generalAmountRegex = /^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|(?:\d+[\s,.]*\d*(?:\s*-\s*\d+[\s,.]*\d*)?)|(?:\d*\s*[/]\s*\d+)|(?:\d+))(\s+|$)/i;
        let generalAmountMatch = currentLine.match(generalAmountRegex);
        if (generalAmountMatch && generalAmountMatch[1]) {
            amountStringPart = generalAmountMatch[1].trim();
            currentLine = currentLine.substring(generalAmountMatch[0].length).trim();
            amount = parseAmountString(amountStringPart);
            console.log(`   Yleinen määräosa tunnistettu: amountStringPart="${amountStringPart}", ParsedAmount=${amount}, currentLine nyt="${currentLine}"`);
        } else {
             // Viimeinen yritys: numero ja yksikkö kiinni toisissaan
            const numberUnitNoSpaceRegex = /^(\d+)([a-zA-ZäöåÄÖÅμ]+)(.*)/i;
            const numberUnitMatch = currentLine.match(numberUnitNoSpaceRegex);
            if (numberUnitMatch) {
                const potentialAmountStr = numberUnitMatch[1];
                const potentialUnitStr = numberUnitMatch[2];
                const restOfLine = (numberUnitMatch[3] || "").trim();
                
                const knownUnitsForNoSpace = Object.keys(unitSynonyms).filter(u => u !== '' && u !== ' ');
                let tempUnitCheck = '';
                for (const knownUnit of knownUnitsForNoSpace) {
                    if (potentialUnitStr.toLowerCase() === knownUnit.toLowerCase()) {
                        tempUnitCheck = knownUnit;
                        break;
                    }
                }

                if (tempUnitCheck) {
                    amountStringPart = potentialAmountStr;
                    amount = parseAmountString(amountStringPart);
                    unit = tempUnitCheck;
                    currentLine = restOfLine;
                    console.log(`   Erityistapaus (numeroYksikkö): amountStringPart="${amountStringPart}", ParsedAmount=${amount}, unit="${unit}", currentLine nyt="${currentLine}"`);
                } else {
                    amount = 1; 
                    console.log(`   Ei selkeää määräosaa tunnistettu alusta (eikä numeroYksikkö-match), currentLine käsittelyyn yksikölle/nimelle="${currentLine}"`);
                }
            } else {
                amount = 1; 
                console.log(`   Ei selkeää määräosaa tunnistettu alusta, currentLine käsittelyyn yksikölle/nimelle="${currentLine}"`);
            }
        }
    }
    
    let tempRemainingForUnit = currentLine;
    console.log(`   Aloitetaan yksikön etsintä, tempRemainingForUnit: "${tempRemainingForUnit}"`);
    const knownUnits = Object.keys(unitSynonyms).filter(u => u !== '' && u !== ' ');
    knownUnits.sort((a, b) => b.length - a.length); 

    if (unit === '') { // Etsi yksikköä vain, jos sitä ei ole jo tunnistettu (esim. "50g" tapauksessa)
        for (const knownUnit of knownUnits) {
            const unitRegex = new RegExp(`^(${knownUnit})(\\s+|$)`, 'i'); 
            if (tempRemainingForUnit.match(unitRegex)) {
                unit = tempRemainingForUnit.match(unitRegex)[1]; 
                tempRemainingForUnit = tempRemainingForUnit.substring(unit.length).trim();
                console.log(`   Yksikkö tunnistettu: unit="${unit}", tempRemainingForUnit nyt="${tempRemainingForUnit}"`);
                break;
            }
        }
    }
    
    name = tempRemainingForUnit.trim();

    if (name === '' && currentLine.length > 0 && unit === '' && (amount !== 1 || (amountStringPart !== '' && amountStringPart !== '1'))) {
        name = currentLine;
        console.log(`   Nimi asetettu currentLineksi (koska tyhjä ja yksikköä ei löytynyt, mutta määrä oli spesifioitu/erilainen kuin oletus): "${name}"`);
    }
    if (name === '' && amount === 1 && unit === '' && originalLine.trim() !== '' && originalLine.trim() !== amountStringPart.trim()) {
        if(amountStringPart === '' || (amountStringPart === '1' && originalLine.trim() !== '1') ) {
            name = originalLine.trim();
            console.log(`   Nimi asetettu originalLineksi (koska kaikki muu tyhjää/oletus tai ei määrää): "${name}"`);
        }
    }
    
    const result = {
        name: name,
        amount: amount,
        unit: normalizeUnit(unit),
        originalLine: originalLine, 
        isEmptyName: name === '',
        amountStringPart: amountStringPart 
    };
    console.log(`--- parseSingleIngredientLine LOPPU --- Palautetaan:`, JSON.stringify(result));
    return result;
  }

  // ... (parseRecipe-funktio ja komponentin loppuosa pysyvät samana kuin edellisessä korjatussa versiossa) ...
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
            parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine });
            console.log("   Puskuri (tyhjä nimi) lisätty ennen INGREDIENTS headeria:", tempIngredientBuffer.originalLine);
        }
        tempIngredientBuffer = null;
        readingStage = 'ingredients';
        console.log("   Vaihdettu tilaan: ingredients");
        continue; 
      } else if (isInstructionsKeyword) {
        if (tempIngredientBuffer && tempIngredientBuffer.isEmptyName) {
             parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine });
             console.log("   Puskuri (tyhjä nimi) lisätty ennen INSTRUCTIONS headeria:", tempIngredientBuffer.originalLine);
        }
        tempIngredientBuffer = null;
        readingStage = 'instructions';
        console.log("   Vaihdettu tilaan: instructions");
        continue;
      }

      if (line === '') {
          if (tempIngredientBuffer && tempIngredientBuffer.isEmptyName) {
              parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine });
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
            if ((!currentParsed.amount || currentParsed.amount === 1) && currentParsed.unit === normalizeUnit('') && currentParsed.name && !currentParsed.isEmptyName) {
                tempIngredientBuffer.name = (`${tempIngredientBuffer.name || ''} ${currentParsed.name}`).trim(); 
                if (currentParsed.name) tempIngredientBuffer.isEmptyName = false;
                
                if (tempIngredientBuffer.originalLine === tempIngredientBuffer.name && currentParsed.name) {
                    tempIngredientBuffer.name = currentParsed.name;
                }

                parsedIngredients.push(tempIngredientBuffer);
                console.log("   Yhdistetty puskuriin, tulos:", JSON.stringify(tempIngredientBuffer));
                tempIngredientBuffer = null;
            } else {
                if (tempIngredientBuffer.isEmptyName) {
                     parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine });
                     console.log("   Puskuri (tyhjä nimi) purettu erillisenä:", tempIngredientBuffer.originalLine);
                } else {
                    parsedIngredients.push(tempIngredientBuffer);
                     console.log("   Puskuri purettu:", JSON.stringify(tempIngredientBuffer));
                }
                
                if (currentParsed.isEmptyName && currentParsed.unit !== normalizeUnit('')) { 
                    tempIngredientBuffer = currentParsed;
                    console.log("   Nykyinen puskuroitu (edellinen purettiin):", JSON.stringify(currentParsed));
                } else if (currentParsed.name || (currentParsed.unit !== normalizeUnit('') && currentParsed.amount !== 1) || (currentParsed.unit === normalizeUnit('') && currentParsed.amount !== 1 && currentParsed.originalLine)) {
                    parsedIngredients.push(currentParsed);
                     console.log("   Nykyinen lisätty suoraan (edellinen puskuri purettiin):", JSON.stringify(currentParsed));
                    tempIngredientBuffer = null;
                } else { 
                    if (currentParsed.originalLine && currentParsed.originalLine.trim() !== '') {
                        parsedIngredients.push({ name: currentParsed.originalLine, amount: 1, unit: normalizeUnit('')});
                        console.log("   Nykyinen lisätty alkuperäisenä rivinä (ei tunnistettu dataa):", currentParsed.originalLine);
                    }
                    tempIngredientBuffer = null;
                }
            }
        } else { 
            if (currentParsed.isEmptyName && (currentParsed.unit !== normalizeUnit('') || (currentParsed.amount !== 1 && currentParsed.amountStringPart ) )) { 
                 if (currentParsed.unit !== normalizeUnit('') || (currentParsed.amount !==1 || (currentParsed.amountStringPart && currentParsed.originalLine.match(/^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|(?:\d+[\s,.]*\d*(?:\s*-\s*\d+[\s,.]*\d*)?)|(?:\d*\s*[/]\s*\d+)|(?:\d+))/i)) ) ) {
                    tempIngredientBuffer = currentParsed;
                    console.log("   Puskuroitu (ei ed. puskuria):", JSON.stringify(currentParsed));
                 } else if (currentParsed.originalLine && currentParsed.originalLine.trim() !== ''){
                     parsedIngredients.push({name: currentParsed.originalLine, amount:1, unit: normalizeUnit('')});
                     console.log("   Lisätty alkuperäinen rivi nimellä (ei ed. puskuria, ei tunnistettu dataa, ei puskuroitu):", currentParsed.originalLine);
                     tempIngredientBuffer = null;
                 } else {
                    tempIngredientBuffer = null;
                 }
            } else  { 
                if (currentParsed.name || currentParsed.unit !== normalizeUnit('') || currentParsed.amount !== 1) {
                    parsedIngredients.push(currentParsed);
                    console.log("   Lisätty suoraan (ei ed. puskuria):", JSON.stringify(currentParsed));
                } else if (currentParsed.originalLine && currentParsed.originalLine.trim() !== ''){
                     parsedIngredients.push({name: currentParsed.originalLine, amount:1, unit: normalizeUnit('')});
                     console.log("   Lisätty alkuperäinen rivi nimellä (ei ed. puskuria, ei tunnistettu dataa):", currentParsed.originalLine);
                }
                tempIngredientBuffer = null;
            }
        }

      } else if (readingStage === 'instructions' && line) {
        const cleanedInstruction = line.replace(/^\d+\.\s*/, '').trim();
        if (cleanedInstruction) {
            parsedInstructionsArray.push(cleanedInstruction);
        }
      }
    }

    if (tempIngredientBuffer) { 
        if (tempIngredientBuffer.isEmptyName && tempIngredientBuffer.originalLine.trim() !== '') {
            parsedIngredients.push({ ...tempIngredientBuffer, name: tempIngredientBuffer.originalLine });
        } else if (!tempIngredientBuffer.isEmptyName) {
            parsedIngredients.push(tempIngredientBuffer);
        }
        console.log("--- Viimeinen puskuri purettu:", JSON.stringify(tempIngredientBuffer));
    }

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

    onRecipeParsed({
      nimi: parsedName,
      ainesosat: parsedIngredients.length > 0 ? parsedIngredients.map(ing => ({name: ing.name, amount: ing.amount, unit: ing.unit})) : [{ name: '', amount: '', unit: '' }],
      ohjeet: parsedInstructionsArray.join('\n'),
    });

    if (parsedName || parsedIngredients.length > 0 || parsedInstructionsArray.length > 0) {
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
// tai
1 pkt (170g)
pekonia
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