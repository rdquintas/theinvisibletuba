##########################################################################
Receita para fazer alterar a HOME PAGE e retirar/colocar um concerto
##########################################################################
Basta ir ao data.json aqui
  theinvisibletuba GIT\app\data.json
  
  e alterar 
  concert.isEnabled:"false"
  para
  concert.isEnabled:"true"
  
  e depois alterar os campos do data.json em conformidade
  
  
  Ao alterar esta flag o grunt-bake vai-me fazer isto:
  if TRUE
    colocoa o concerto
	e esconde o banner da newsletter
  if FALSE
    esconde o concerto
	e coloca o banner da newsletter
  

##########################################################################
Receita para fazer um generate para um novo LANDING PAGE dum concerto
##########################################################################

1) Apago todos os .html aqui
   theinvisibletuba GIT\landing\concert\*
   Nao apagar o Readme.txt
   
2) Copio o folder dum concerto anterior assim por exemplo
   theinvisibletuba GIT\landing\concert\_sources\camones
   para
   theinvisibletuba GIT\landing\concert\_sources\novo_gig
   
3) Altero o
   theinvisibletuba GIT\landing\concert\_sources\novo_gig\data.json
   de acordo com as traduções necessarias etc..
   acrescentar novo link dos tickets
   acrescentar nova imagem do espaço: por ex "../../assets/img/457x558_camones.png",
   etc...
   
4) Altero todos os html que precisar aqui
   theinvisibletuba GIT\landing\concert\_sources\novo_gig\*.json
   noeadamente
     - tirar/alterar partes da FAQ
	 - ver na parte dos comeres se é necessario alterar algo
	 - etc---
	 
5) Abro um terminal aqui dentro
   theinvisibletuba GIT\landing\concert\_sources\novo_gig\
   e corro o comando 
   grunt bake
   
6) Confirmar que foram criadas as paginas html aqui
   theinvisibletuba GIT\landing\concert\*.html
   
7) Fazer deploy e testar os links e LANGUAGE pages
      