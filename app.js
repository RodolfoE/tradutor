const translatte = require('translatte');
const fs = require('fs');


const output = (sigla, frase) => console.log(`${sigla.toUpperCase()}: ${frase}` );

/**
 * Outputs the translations whether on terminal line, or in the file
 * @param {*} tagName 
 * @param {*} phrase 
 * @param {*} path 
 * @param {*} insertInFile if true, inserts the new value to the end of the file
 */
const outputXml = (tagName, phrase, path, insertInFile) => {
    try{
        if (insertInFile)
            InserirNoFinalDoArquivo(path, tagName, phrase);
        else {
            let newTag = `
                <data name="${tagName}" xml:space="preserve">
                    <value>${phrase}</value>
                </data>`;
            console.log(`${newTag} \n ${path}`);
        }
    } catch (err){   
       console.error(err);
    }
}

/**
 * reads the .resx  file from path and inserts the new <data> to the end of this file
 * @path site of the .resx file
 * @phrase the translated phrase 
 * @tagname the name attr of the <data> tag
 */
const InserirNoFinalDoArquivo = async (path, tagName, phrase) => {
    let newTag = `\t<data name="${tagName}" xml:space="preserve">\n\t\t<value>${phrase}</value>\n\t</data>`;
    if (!fs.existsSync(path)){
        console.log('Arquivo caminho.js não configurado, ou configurado de maneira incorreta.')
        throw 'Error'
    } 
    const data = fs.readFileSync(path, {encoding:'utf8', flag:'r'});
    let valorAserAlterado = data.slice(0, data.indexOf('</root>'));
    valorAserAlterado = valorAserAlterado + newTag;
    valorAserAlterado = valorAserAlterado + '\n</root>';        
    fs.writeFileSync(path, valorAserAlterado);
}

/**
 * Tries 3 times to translate from pt to @lingu using googles translatte Library
 * @param {*} phrase 
 * @param {string} lingu the idiom that should be translated, ex: en for english, es for spannish and so on
 * @returns the translation or the error message
 */
const translate = async (phrase, lingu) => {
    for (let attempt = 0; attempt < 3; attempt++) 
        try{
            const { text } = await translatte(phrase, { from: 'pt', to: lingu});
            return text;        
        } catch (err){
            console.error(err);
            if (attempt === 2)
                return 'ERRO NA TRADUÇÂO: ' + err.message;
        }
}

/**
 * Get the 'terms' in the phrase. terms are any words that is surrounded by brackest, such as {acoes}
 * @param {*} frase 
 * @returns 
 */
const obterTermos = (frase) => frase.match(/{(.*?)\}/g) && frase.match(/{(.*?)\}/g).map(x => x.replace('{', '').replace('}', ''));

const inserirTermos = (terms, fras) => {
    fras = fras.replace(/{(.*?)\}/g, `@#9%1`);
    terms && terms.forEach(termo => {
        fras = fras.replace('@#9%1', `{${termo}}`);
    })
    return fras;
}

const obterTradESigla = async (lingu, frase, palavrasEmCouchete) => {
    const fraseTraduzida = await translate(frase, lingu);
    const fraseTraduzidaComTermos = inserirTermos(palavrasEmCouchete, fraseTraduzida);
    return {lingu, fraseTraduzidaComTermos};
}

/**
 * Get the 'terms' in the phrase given by the user (words that appear inside {}, ex: Eu faço {acoes})
 * @param {stirng} frase 
 * @param {array} arrDeIdiom ['pt', 'en' ...]
 * @returns [{lingu, fraseTraduzidaComTermos}...] @lingu : 'pt', 'en', ...
 */
const obterTraducaoESigla = async (frase, arrDeIdiom) => {
    let palavrasEmCouchete = obterTermos(frase);
    let promises = [];
    for (let i = 0; i < arrDeIdiom.length; i++) 
        promises.push(obterTradESigla(arrDeIdiom[i], frase, palavrasEmCouchete))
    return await Promise.all(promises);
}

/**
 * Filter out paths of languages already been translated by the user
 */
const getPathsNotTranslatted = (paths, phraseAlreadyTransl) => 
    paths.filter(path => 
        !phraseAlreadyTransl || // user didn't translated any phrase
        !phraseAlreadyTransl.find( // filters out the phrases of languages already been translated by the user
            ({sigla}) => sigla.toUpperCase() === path.id.toUpperCase() 
        )
    )

const translateAndOutput = async (tagEfrase, paths, formatoExibicao, phraseAlreadyTransl) => {
    let traducoes = await obterTraducaoESigla(
        tagEfrase['frase'], 
        getPathsNotTranslatted(paths, phraseAlreadyTransl).map(x => x.id)
    );

    //inserts into traducoes, the translated phrases the user provided
    phraseAlreadyTransl && phraseAlreadyTransl.forEach(({sigla, fraseJaTraduzida}) => traducoes.push({lingu: sigla, fraseTraduzidaComTermos: fraseJaTraduzida}));

    const userInput = _getUserInput();
    const insertEndFile =  (() => {
        const resp = userInput("Inserir no final do .resx ? [s] | [n]")
        return resp.toUpperCase() === 'S';
    })();

    console.log(`#####   ${tagEfrase['tagName']}   ######`)
    for (let i = 0; i < traducoes.length; i++) {
        const e = traducoes[i];   
        switch(formatoExibicao){
            case 'xml':
                outputXml(tagEfrase['tagName'], e['fraseTraduzidaComTermos'], paths.find(y => y.id.toUpperCase() == e['lingu'].toUpperCase()).path, insertEndFile);
                break;
            case 'txt':
                output(e['lingu'], e['fraseTraduzidaComTermos'])
                break;
        }            
    }
    console.log(' \n');
}

/**
 * Closes the connection to interface if no displayPhrase is given
 * @param {string} displayPhrase phrase to be displayed in the terminal instructing the user's input 
 * @returns Promise resolving with the typed in user phrase
 */
const _getUserInput = () => {
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    return ((displayPhrase) => {
        if (!displayPhrase) rl.close();

        return new Promise((resolve, reject) => {
            rl.question(displayPhrase, (phrase) => {
                resolve(phrase);
            });
        });
    });    
}

(async () => {
	const caminho = require('./caminho');
	const getUserInput = _getUserInput();

    switch(process.argv[2]){
        case 'path' || 'caminho': 
            caminho.forEach(c => console.log(`${c.id} | ${c.path}`));
            return;

        case 'txt' || 'resource' || 'marvin':
            const userInput = await getUserInput('Frase a ser traduzida? ');
            await translateAndOutput({tagName: '', userInput}, caminho, 'txt');
            getUserInput(); //closes the connection
            return;

        default: 
            const tagName = await getUserInput('Nome da Tag? ');
            const frasesIdiomaJaTraduzido = [];
            const funcFraseJaTraduzida = async () => {
                const userInput = await getUserInput("Algum idioma já traduzido? [n] para sair (obs: comece com sigla e ':', ex: EN: frase já traduzida) ")
                if (userInput !== 'n'){
                    if (!userInput.includes(':')){
                        console.log('Formato incorreto');
                        await funcFraseJaTraduzida();
                        getUserInput();
                        return;
                    }
                        
                    const sigla = userInput.split(':')[0];
                    const fraseJaTraduzida = userInput.split(':')[1];
                    frasesIdiomaJaTraduzido.push({sigla, fraseJaTraduzida});  
                    await funcFraseJaTraduzida();
                    getUserInput();
                    return;
                }
                const frase = await getUserInput('Frase a ser traduzida? ');
                await translateAndOutput({tagName, frase}, caminho, 'xml', frasesIdiomaJaTraduzido);
                getUserInput(); 
            }
            funcFraseJaTraduzida(); //closes the connection  
            return;
    }
})();
