const translatte = require('translatte');
const output = (sigla, frase) => console.log(`${sigla.toUpperCase()}: ${frase}` );
const outputXml = (tagName, frase, caminho) => console.log(`
<data name="${tagName}" xml:space="preserve">
    <value>${frase}</value>
</data>
${caminho}
`);

const traduzir = async (frase, lingu) => {
    for (let tentativa = 0; tentativa < 3; tentativa++) 
        try{
            const {text} = await translatte(frase, { from: 'pt', to: lingu});
            return text;        
        } catch (err){
            console.error(err);
            if (tentativa === 2)
                return 'ERRO NA TRADUÇÂO: ' + err.message;
        }
}

const obterTermos = (frase) => frase.match(/{(.*?)\}/g) && frase.match(/{(.*?)\}/g).map(x => x.replace('{', '').replace('}', ''));

const inserirTermos = (terms, fras) => {
    fras = fras.replace(/{(.*?)\}/g, `@#9%1`);
    terms && terms.forEach(termo => {
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

const interfaceTraduzEExibe = async (tagEfrase, caminho, formatoExibicao, frasesJaTraduzidas) => {
    let traducoes = await obterTraducaoESigla(tagEfrase['frase'], caminho
    .filter(x => !frasesJaTraduzidas || frasesJaTraduzidas.filter(({sigla}) => sigla.toUpperCase() === x.id.toUpperCase()).length === 0)
    .map(x => x.id));
    frasesJaTraduzidas && frasesJaTraduzidas.forEach(({sigla, fraseJaTraduzida}) => traducoes.push({lingu: sigla, fraseTraduzidaComTermos: fraseJaTraduzida}));

    console.log(`#####   ${tagEfrase['tagName']}   ######`)
    for (let i = 0; i < traducoes.length; i++) {
        const e = traducoes[i];   
        switch(formatoExibicao){
            case 'xml':
                outputXml(tagEfrase['tagName'], e['fraseTraduzidaComTermos'], caminho.find(y => y.id.toUpperCase() == e['lingu'].toUpperCase()).path);
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

        if (process.argv[2] === 'path'){
            caminho.forEach(c => console.log(`${c.id}\n${c.path}`));
            return;
        }

        if (['xml', 'txt'].filter(x => x == process.argv[2]).length)
            interfaceTraduzEExibe(x, caminho, process.argv[2])
        else 
            interfaceTraduzEExibe(x, caminho, 'xml');
    });
});

(() => {
	const caminho = require('./caminho');
	const readline = require("readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
    if (process.argv[2] === 'path'){
        caminho.forEach(c => console.log(`${c.id} | ${c.path}`));
        return;
    } else if ('txt' === process.argv[2])
		rl.question("Frase a ser traduzida? ", async function(frase) {
			await interfaceTraduzEExibe({tagName: '', frase}, caminho, 'txt');
			rl.close();
		});
	else 
		rl.question("Nome da Tag? ", function(tagName) {
            const frasesIdiomaJaTraduzido = [];
			const funcFraseJaTraduzida = () =>
                rl.question("Algum idioma já traduzido? [n] para sair (obs: comece com sigla e ':', ex: EN: frase já traduzida) ", function(frase) {
				    if (frase !== 'n'){
                        if (!frase.includes(':')){
                            console.log('Formato incorreto');
                            funcFraseJaTraduzida();
                        }
                            
                        const sigla = frase.split(':')[0];
                        const fraseJaTraduzida = frase.split(':')[1];
                        frasesIdiomaJaTraduzido.push({sigla, fraseJaTraduzida});  
                        funcFraseJaTraduzida();
                    }
                    rl.question("Frase a ser traduzida? ", async function(frase) {
                        await interfaceTraduzEExibe({tagName, frase}, caminho, 'xml', frasesIdiomaJaTraduzido);
                        rl.close();
                    });
			    });
            funcFraseJaTraduzida();
            
		});

	rl.on("close", function() {
		process.exit(0);
	});
})();