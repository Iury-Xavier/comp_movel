create database comp_movel;
use comp_movel;

create table usuario(
	USU_ID integer NOT NULL PRIMARY KEY auto_increment,
	USU_usuario varchar(30) NOT NULL,
    USU_nome varchar(50) NOT NULL,
	USU_email varchar(50),
	USU_telefone varchar(11),
	USU_senha varchar(50) NOT NULL,
	USU_lvlAcesso integer NOT NULL
);

create table vendas(
	VEN_ID integer NOT NULL PRIMARY KEY auto_increment,
	VEN_vendedorID integer NOT NULL,
    VEN_quant integer,
    VEN_dataVenda date NOT NULL,
    VEN_horaVenda time NOT NULL,
    VEN_tipoPag varchar(20) NOT NULL,
    VEN_valorTotal double,    
    foreign key (VEN_vendedorID) references usuario(USU_ID)    
);
