// import { studioService } from 'src/services';
import { Button, message } from 'antd';
import React from 'react';
import { IPerformer } from 'src/interfaces';
import { getResponseError } from 'src/lib';

interface PropsInterface {
  member: IPerformer;
  updateMemberStatus: Function;
}

export default ({ member, updateMemberStatus }: PropsInterface) => {
  const [processing, setProcessing] = React.useState(false);
  const handleChangeStatus = async (m) => {
    try {
      // window.confirm
      setProcessing(true);
      // const resp = await studioService.updateMemberStatus(
      //   m._id,
      //   m.status === 'active' ? 'inactive' : 'active'
      // );
      updateMemberStatus(m._id);
      message.success('Update Success');
    } catch (e) {
      const err = await Promise.resolve(e);
      message.error(getResponseError(err));
    } finally {
      setProcessing(false);
    }
  };
  return (
    <Button
      type={member.status === 'active' ? 'default' : 'primary'}
      onClick={() => handleChangeStatus(member)}
      loading={processing}
      disabled={processing}
    >
      {member.status === 'active' ? 'Inactive' : 'Active'}
    </Button>
  );
};
