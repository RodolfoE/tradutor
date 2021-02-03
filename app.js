const translatte = require('translatte');
const output = (sigla, frase) => console.log(`${sigla.toUpperCase()}: ${frase}` );
const outputXml = (tagName, frase, caminho) => console.log(`
    <data name="${tagName}" xml:space="preserve">
        <value>${frase}</value>
    </data>
${caminho}
`);

const traduzir = async (frase, lingu) => {
    try{
        const {text} = await translatte(frase, { from: 'pt', to: lingu});
        return text;        
    } catch (err){
        console.error(err);
        return 'ERRO NA TRADUÇÂO: ' + err.message;
    }
}

const obterTermos = (frase) => frase.match(/{(.*?)\}/g).map(x => x.replace('{', '').replace('}', ''));

const inserirTermos = (terms, fras) => {
    fras = fras.replace(/{(.*?)\}/g, `@#9%1`);
    terms.forEach(termo => {
        fras = fras.replace('@#9%1', `{${termo}}`);
    })
    return fras;
}

const obterTradESigla = async (lingu, frase, palavrasEmCouchete) => {
    const fraseTraduzida = await traduzir(frase, lingu);
    const fraseTraduzidaComTermos = inserirTermos(palavrasEmCouchete, fraseTraduzida);
    return {lingu, fraseTraduzidaComTermos};
}

const obterTraducaoESigla = async (frase, arrDeIdiom) => {
    let palavrasEmCouchete = obterTermos(frase);
    let traducaoESigla = [];
    for (let i = 0; i < arrDeIdiom.length; i++) {
        const lingu = arrDeIdiom[i];
        traducaoESigla.push(await obterTradESigla(lingu, frase, palavrasEmCouchete));
    }
    return traducaoESigla;
}

const interfaceTraduzEExibe = async (tagEfrase, caminho, formatoExibicao) => {
    let traducoes = await obterTraducaoESigla(tagEfrase['frase'], caminho.map(x => x.id));    
    console.log(`#####   ${tagEfrase['tagName']}   ######`)
    for (let i = 0; i < traducoes.length; i++) {
        const e = traducoes[i];   
        switch(formatoExibicao){
            case 'xml':
                outputXml(tagEfrase['tagName'], e['fraseTraduzidaComTermos'], caminho.find(y => y.id == e['lingu']).path);
                break;
            case 'txt':
                output(e['lingu'], e['fraseTraduzidaComTermos'])
                break;
        }            
    }
    console.log('\n');
}

(() => {
    const caminho = require('./caminho');
    const tagEfrase = require('./tags');
    tagEfrase.forEach(x => {
        if (['xml', 'txt'].filter(x => x == process.argv[2]).length)
            interfaceTraduzEExibe(x, caminho, process.argv[2])
        else 
            interfaceTraduzEExibe(x, caminho, 'xml');
    });
})();
