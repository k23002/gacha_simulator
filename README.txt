�K�`���V�~�����[�^�[


�\�[�V�����Q�[���Ȃǂň�ʓI�Ɍ�����u�K�`���v�@�\���V�~�����[�g���邽�߂�Web�A�v���P�[�V�����ł��B�v���C���[�Ƃ��ăK�`���������̌����ł��邾���łȂ��A�Ǘ��҂Ƃ��ăK�`���̔r�o�L�����N�^�[��m�������R�ɐ݌v�E�V�~�����[�V�������邱�Ƃ��ł��܂��B


���O����
�ȉ��̃R�[�h�����ꂼ��t�����g�G���h���̃^�[�~�i���ƃo�b�N�G���h���̃^�[�~�i���ŁA��s�����s���Ă��������B

�E�t�����g�G���h

�@1. �^�[�~�i����Ńt�����g�G���h�f�B���N�g���Ɉړ�����B
�@�@�@cd {�ۑ��ꏊ}/UTF8/app/frontend

�@2. �K�v�ȃp�b�P�[�W���C���X�g�[������B
�@�@�@yarn install

�@3. �t�����g�G���h�̃T�[�o���N������B
�@�@�@yarn dev


�E�o�b�N�G���h

�@1. �^�[�~�i����Ńo�b�N�G���h�f�B���N�g���Ɉړ�����B
�@�@�@cd {�ۑ��ꏊ}/UTF8/app/backend

�@2. Python�̉��z�����쐬�E�L����
�@�@�@python -m venv venv
�@�@�@source venv/bin/activate  # Mac/Linux�̏ꍇ
�@�@�@venv�Scripts�activate    # Windows�̏ꍇ

�@3. �K�v�ȃ��C�u�������C���X�g�[��
�@�@�@pip install -r requirements.txt

�@4. �f�[�^�x�[�X�̏������ƃT���v���f�[�^�̓���
�@�@�@chmod +x initialize_db.sh
�@�@�@./initialize_db.sh

�@5. �o�b�N�G���h�T�[�o�[���N��
�@�@�@python manage.py runserver --settings=config.settings.development


�A�v���P�[�V�����̋N��

�T�[�o�̋N�����Web��̃��[�J���z�X�g�ŁA�t�����g�G���h�ƃo�b�N�G���h�ɃA�N�Z�X���邱�Ƃ��ł��܂��B

�@�t�����g�G���h�Fhttp://localhost:3000

�@�o�b�N�G���h�Fhttp://localhost:8000


�g����

http://localhost:3000/main/login�ɃA�N�Z�X���邩�A�w�b�_�[�̃��O�A�E�g�{�^�����������ƂŃ��O�C����ʂɈڍs���܂��B
initialize_db.sh �ɂ���č쐬���ꂽ�ȉ��̏����A�J�E���g�Ń��O�C�����邱�ƂŁA�A�v���P�[�V�����𑀍삷�邱�Ƃ��ł��܂��B

�E�Ǘ��҃A�J�E���g

�@�@���[�U�[���F admin

�@�@�p�X���[�h�F adminpass

�E��ʃ��[�U�[�A�J�E���g

�@�@���[�U�[���F player

�@�@�p�X���[�h�F playerpass


��ȋ@�\
�E�v���C���[�����@�\

�@�E�K�`�����s�F 1��܂���10��A���ŃK�`�����������Ƃ��ł��܂��B

�@�E�L�����N�^�[�ꗗ�F �K�`���Ŏ�ɓ��ꂽ�L�����N�^�[�̊m�F���ł��܂��B

�@�E�K�`�������F ���A�ǂ̃K�`�����牽���o�����̗������{���ł��܂��B

�@�E���[�U�[�F�؁F ���[�U�[���Ƃ̃f�[�^�Ǘ����\�ł��B

�E�Ǘ��Ҍ����@�\

�@�E�K�`���Ǘ��F �K�`���̍쐬�A�ҏW�A�폜���ł��܂��B

�@�E�L�����N�^�[�Ǘ��F �r�o�ΏۂƂȂ�L�����N�^�[�̍쐬�A�ҏW�A�폜���ł��܂��B

�@�E�r�o���ݒ�F �K�`�����ƂɃ��A���e�B�ʂ̔r�o����A����L�����N�^�[�̃s�b�N�A�b�v�ݒ�Ȃǂ��ׂ�����`�ł��܂��B