FROM node:10.16.1-jessie

RUN dpkg --add-architecture i386
RUN apt update
RUN apt -y install python make libxkbfile-dev libxkbfile-dev:i386 libx11-dev libx11-dev:i386 libxss-dev gcc-multilib g++-multilib rpm

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]