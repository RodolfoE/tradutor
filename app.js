const frase = `Obtem os {projetos} em que todas as {acoes} já foram Concluida, Arquivada ou Cancelada, e envia um e-mail ao {responsavel}, pedindo para que ele conclua o(s) {projeto}(s) manualmente
`
const translatte = require('translatte');

const traduzir = async (frase, lingu) => {
    try{
        const {text} = await translatte(frase, { from: 'pt', to: lingu});
        return text;        
    } catch (err){
        console.error(err);
        return '';
    }
}

const obterTermos = (frase) => frase.match(/{(.*?)\}/g).map(x => x.replace('{', '').replace('}', ''));
const inserirTermos = (terms, fras) => {
    fras = fras.replace(/{(.*?)\}/g, `@9@1`);
    terms.forEach(termo => {
        fras = fras.replace('@9@1', `{${termo}}`);
    })
    return fras;
}

const traduzirParaAsLinguagens = (arrDeIdiom) => {
    let palavrasEmCouchete = obterTermos(frase);
    arrDeIdiom.forEach(async lingu => {
        const fraseTraduzida = await traduzir(frase, lingu);
        const fraseTraduzidaComTermos = inserirTermos(palavrasEmCouchete, fraseTraduzida);
        output(lingu, fraseTraduzidaComTermos);
    })       
}

const output = (lingu, frase) => console.log(`${lingu.toUpperCase()}: ${frase}\n` );

output('pt', frase);
traduzirParaAsLinguagens(['en', 'fr', 'it', 'nl', 'de', 'es']);