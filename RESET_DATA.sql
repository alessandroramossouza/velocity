
-- Este comando apaga TODOS os carros do banco de dados.
-- Ele NÂO apaga os usuários (locador/locatário), então o login continua funcionando.

DELETE FROM public.cars;

-- Se quiser conferir se apagou mesmo, rode:
-- SELECT * FROM public.cars;
