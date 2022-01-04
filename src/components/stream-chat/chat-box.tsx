import { Tabs } from 'antd';
import React from 'react';
import StreamMessenger from '@components/stream-chat/Messenger';
import UserList from '@components/stream-chat/UserList';
import { IPerformer, IUser } from 'src/interfaces';
import './chat-box.less';

interface IProps {
  isPublic?: boolean;
  totalParticipant?: number;
  activeConversation?: any;
  currentPerformer?: IPerformer;
  loggedIn?: boolean;
  members?: IUser[];
}
const ChatBox = ({
  isPublic,
  activeConversation,
  totalParticipant,
  currentPerformer,
  loggedIn,
  members
}: IProps) => (
  <div className="conversation-stream">
    <Tabs defaultActiveKey="chat_content">
      <Tabs.TabPane tab="CHAT" key="chat_content">
        {activeConversation
            && activeConversation.data
            && activeConversation.data.streamId && (
              <StreamMessenger
                isPublic={isPublic}
                streamId={activeConversation.data.streamId}
              />
        )}
      </Tabs.TabPane>
      <Tabs.TabPane tab={`USER (${totalParticipant || 0})`} key="chat_user">
        <UserList
          currentPerformer={currentPerformer}
          loggedIn={loggedIn}
          members={members}
        />
      </Tabs.TabPane>
    </Tabs>
  </div>
);
ChatBox.defaultProps = {
  isPublic: false,
  totalParticipant: 0,
  activeConversation: null,
  currentPerformer: null,
  loggedIn: false,
  members: []
};
export default ChatBox;
